import { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3, S3_BUCKET_NAME } from "../../config/s3";
import { promises as fs, createReadStream } from "fs";
import crypto from "crypto";

/* ================= CONSTANTS ================= */
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

/**
 * Files above this size use S3 multipart upload.
 * AWS recommends multipart for anything > 25 MB.
 * Benefits: chunked transfer, per-part retry, parallel part upload.
 */
const MULTIPART_THRESHOLD = 25 * 1024 * 1024; // 25 MB (AWS recommended)
const MULTIPART_PART_SIZE = 10 * 1024 * 1024; // 10 MB per part
const MULTIPART_CONCURRENCY = 4; // parallel part uploads

/* ================= RETRY WRAPPER ================= */
const retryUpload = async <T>(
  uploadFn: () => Promise<T>,
  retries = MAX_RETRIES
): Promise<T> => {
  let lastErr: any;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await uploadFn();
    } catch (error) {
      lastErr = error;

      if (attempt === retries) break;

      await new Promise((r) => setTimeout(r, RETRY_DELAY * attempt));
    }
  }

  throw lastErr;
};

/* ================= HELPERS ================= */

const safeName = (name: string) =>
  name.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9._-]/g, "");

const readFileBuffer = async (file: Express.Multer.File) => {
  if (file.buffer) return file.buffer;
  if (file.path) return fs.readFile(file.path);

  throw new Error("Unable to read uploaded file data");
};

/**
 * Returns the appropriate Cache-Control header per content type.
 * - Images (thumbnails): immutable, 1 year — tiny, viewed often.
 * - PDFs (notes):        immutable, 1 year — content never changes
 *                        at the same key (key has timestamp + random hex).
 *
 * "immutable" tells clients the content at this URL will never change,
 * so they should never re-validate — saves bandwidth on mobile (React Native).
 */
const getCacheControl = (contentType: string): string => {
  if (contentType.startsWith("image/")) {
    return "public, max-age=31536000, immutable";
  }
  if (contentType === "application/pdf") {
    return "public, max-age=31536000, immutable";
  }
  return "public, max-age=86400"; // fallback: 1 day
};

/**
 * S3 multipart upload with automatic chunking & per-part retry.
 * Used for buffers > MULTIPART_THRESHOLD (25 MB).
 */
const multipartUpload = async (
  key: string,
  body: Buffer,
  contentType: string,
  cacheControl: string
): Promise<void> => {
  const upload = new Upload({
    client: s3,
    params: {
      Bucket: S3_BUCKET_NAME,
      Key: key,
      Body: body,
      ContentType: contentType,
      ContentLength: body.length,
      CacheControl: cacheControl,
    },
    queueSize: MULTIPART_CONCURRENCY,
    partSize: MULTIPART_PART_SIZE,
    leavePartsOnError: false, // auto-clean failed parts
  });

  await upload.done();
};

/* ================= UPLOAD ================= */

export const uploadToS3 = async (
  file: Express.Multer.File,
  folder: "thumbnails" | "notes" | string,
  userId: string
): Promise<{ key: string }> => {
  const unique = crypto.randomBytes(8).toString("hex");

  const key = `${folder}/${userId}/${Date.now()}_${unique}_${safeName(
    file.originalname
  )}`;

  const buffer = await readFileBuffer(file);
  const contentType = file.mimetype ?? "application/octet-stream";
  const cacheControl = getCacheControl(contentType);

  if (buffer.length > MULTIPART_THRESHOLD) {
    /* --- Large file: multipart upload (chunked, parallel, per-part retry) --- */
    await retryUpload(() =>
      multipartUpload(key, buffer, contentType, cacheControl)
    );
  } else {
    /* --- Small file: single PutObject with retry wrapper --- */
    const uploadFn = async () => {
      await s3.send(
        new PutObjectCommand({
          Bucket: S3_BUCKET_NAME,
          Key: key,
          Body: buffer,
          ContentType: contentType,
          CacheControl: cacheControl,
        })
      );
    };
    await retryUpload(uploadFn);
  }

  return { key };
};

/* ================= UPLOAD (PRE-LOADED BUFFER) ================= */

/**
 * Upload a pre-loaded buffer to S3.
 * Use this when the file data has already been read into memory
 * (e.g. after PDF validation) to avoid a redundant disk read.
 *
 * Automatically uses multipart upload for buffers > 25 MB.
 */
export const uploadBufferToS3 = async (
  buffer: Buffer,
  file: Express.Multer.File,
  folder: "thumbnails" | "notes" | string,
  userId: string
): Promise<{ key: string }> => {
  const unique = crypto.randomBytes(8).toString("hex");

  const key = `${folder}/${userId}/${Date.now()}_${unique}_${safeName(
    file.originalname
  )}`;

  const contentType = file.mimetype ?? "application/octet-stream";
  const cacheControl = getCacheControl(contentType);

  if (buffer.length > MULTIPART_THRESHOLD) {
    /* --- Large file: multipart upload (chunked, parallel, per-part retry) --- */
    await retryUpload(() =>
      multipartUpload(key, buffer, contentType, cacheControl)
    );
  } else {
    /* --- Small file: single PutObject with retry wrapper --- */
    const uploadFn = async () => {
      await s3.send(
        new PutObjectCommand({
          Bucket: S3_BUCKET_NAME,
          Key: key,
          Body: buffer,
          ContentType: contentType,
          ContentLength: buffer.length,
          CacheControl: cacheControl,
        })
      );
    };
    await retryUpload(uploadFn);
  }

  return { key };
};

/* ================= SIGNED DOWNLOAD URL ================= */

export const getS3SignedDownloadUrl = async (
  key: string,
  expiresInSec = 900,
  contentType?: string
) => {
  if (!key) throw new Error("S3 key is required");

  /**
   * ResponseCacheControl tells the client how long to cache the downloaded
   * response.  We use a shorter max-age than the object's own CacheControl
   * because signed URLs expire — the client should cache the *data* for
   * the signed URL's lifetime, then request a fresh signed URL.
   *
   * React Native's fetch() and networking stack (OkHttp on Android,
   * NSURLSession on iOS) fully honour standard Cache-Control headers,
   * so the downloaded file data will be served from the local cache
   * on repeat accesses within the TTL — zero extra bandwidth.
   */
  const responseCacheControl =
    expiresInSec >= 3600
      ? `public, max-age=${expiresInSec}, immutable` // long-lived (thumbnails)
      : `public, max-age=${expiresInSec}`;            // short-lived (PDFs)

  return getSignedUrl(
    s3,
    new GetObjectCommand({
      Bucket: S3_BUCKET_NAME,
      Key: key,
      ResponseContentDisposition: `inline; filename="${key
        .split("/")
        .pop()}"`,
      ResponseCacheControl: responseCacheControl,
      ...(contentType ? { ResponseContentType: contentType } : {}),
    }),
    { expiresIn: expiresInSec }
  );
};

/* ================= STREAM UPLOAD FROM DISK ================= */

/**
 * Stream a file directly from disk to S3 using multipart upload.
 * Avoids loading the entire file into memory — ideal for large PDFs.
 */
export const uploadFileStreamToS3 = async (
  filePath: string,
  file: Express.Multer.File,
  folder: "thumbnails" | "notes" | string,
  userId: string
): Promise<{ key: string }> => {
  const unique = crypto.randomBytes(8).toString("hex");

  const key = `${folder}/${userId}/${Date.now()}_${unique}_${safeName(
    file.originalname
  )}`;

  const contentType = file.mimetype ?? "application/octet-stream";
  const cacheControl = getCacheControl(contentType);

  const stream = createReadStream(filePath);

  const upload = new Upload({
    client: s3,
    params: {
      Bucket: S3_BUCKET_NAME,
      Key: key,
      Body: stream,
      ContentType: contentType,
      ContentLength: file.size,
      CacheControl: cacheControl,
    },
    queueSize: MULTIPART_CONCURRENCY,
    partSize: MULTIPART_PART_SIZE,
    leavePartsOnError: false,
  });

  await upload.done();
  return { key };
};

/* ================= DELETE ================= */

export const deleteFromS3 = async (key: string) => {
  await s3.send(
    new DeleteObjectCommand({
      Bucket: S3_BUCKET_NAME,
      Key: key,
    })
  );
};