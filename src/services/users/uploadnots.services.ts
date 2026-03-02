import {
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3, S3_BUCKET_NAME } from "../../config/s3";
import { promises as fs } from "fs";
import crypto from "crypto";

/* ================= CONSTANTS ================= */

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

/* ================= RETRY WRAPPER ================= */

const retryUpload = async <T>(
  uploadFn: () => Promise<T>,
  retries = MAX_RETRIES
): Promise<T> => {
  let lastErr: any;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await uploadFn();
    } catch (error: any) {
      lastErr = error;
      if (attempt === retries) break;

      await new Promise((r) =>
        setTimeout(r, RETRY_DELAY * attempt)
      );
    }
  }

  throw lastErr;
};

/* ================= HELPERS ================= */

const safeName = (name: string) =>
  name
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9._-]/g, "");

const readFileBuffer = async (file: Express.Multer.File) => {
  if (file.buffer) return file.buffer;
  if (file.path) return fs.readFile(file.path);
  throw new Error("Unable to read uploaded file data");
};

/* ================= UPLOAD TO S3 ================= */

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

  const uploadFn = async () => {
    await s3.send(
      new PutObjectCommand({
        Bucket: S3_BUCKET_NAME,
        Key: key,
        Body: buffer,

        // 🔥 Safe Content Type
        ContentType:
          file.mimetype || "application/octet-stream",

        // Prevent PDF caching issues
        CacheControl:
          file.mimetype === "application/pdf"
            ? "no-cache"
            : "public, max-age=31536000",
      })
    );
  };

  await retryUpload(uploadFn);

  return { key };
};

/* ================= SAFE SIGNED DOWNLOAD URL ================= */
/**
 * 🔥 CRITICAL FIX:
 * - Prevent checksum signing
 * - Prevent x-amz-checksum-mode
 * - Android compatible
 */

export const getS3SignedDownloadUrl = async (
  key: string,
  expiresInSec = 900,
  contentType?: string
) => {
  const command = new GetObjectCommand({
    Bucket: S3_BUCKET_NAME,
    Key: key,
    ResponseContentDisposition: "inline",
    ...(contentType && { ResponseContentType: contentType }),
  });

  return await getSignedUrl(s3, command, {
    expiresIn: expiresInSec,
    signableHeaders: new Set(["host"]), // 🔥 IMPORTANT
  });
};

/* ================= DELETE FROM S3 ================= */

export const deleteFromS3 = async (key: string) => {
  await s3.send(
    new DeleteObjectCommand({
      Bucket: S3_BUCKET_NAME,
      Key: key,
    })
  );
};