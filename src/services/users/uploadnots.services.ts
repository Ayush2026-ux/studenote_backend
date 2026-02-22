import { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3, S3_BUCKET_NAME } from "../../config/s3";
import { promises as fs } from "fs";
import crypto from "crypto";

/* ================= CONSTANTS ================= */
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;
const UPLOAD_TIMEOUT = 600000;

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

/* ================= UPLOAD TO S3 ================= */
export const uploadToS3 = async (
  file: Express.Multer.File,
  folder: "thumbnails" | "notes" | string,
  userId: string
): Promise<{ key: string }> => {
  const unique = crypto.randomBytes(8).toString("hex");
  const key = `${folder}/${userId}/${Date.now()}_${unique}_${safeName(file.originalname)}`;
  const buffer = await readFileBuffer(file);

  const uploadFn = async () => {
    await s3.send(
      new PutObjectCommand({
        Bucket: S3_BUCKET_NAME,
        Key: key,
        Body: buffer,
        ContentType: file.mimetype, // image/jpeg or application/pdf
        CacheControl: "public, max-age=31536000",
      })
    );
  };

  await retryUpload(uploadFn);
  return { key };
};

/* ================= SIGNED DOWNLOAD URL (FIXED FOR IMAGES + PDF) ================= */
export const getS3SignedDownloadUrl = async (
  key: string,
  expiresInSec = 900,
  contentType?: string
) => {
  return getSignedUrl(
    s3,
    new GetObjectCommand({
      Bucket: S3_BUCKET_NAME,
      Key: key,
      ResponseContentDisposition: "inline",
      ...(contentType ? { ResponseContentType: contentType } : {}), // ✅ only set when needed
      ResponseCacheControl: "public, max-age=1800, stale-while-revalidate=300",
    }),
    { expiresIn: expiresInSec }
  );
};

/* ================= DELETE ================= */
export const deleteFromS3 = async (key: string) => {
  await s3.send(new DeleteObjectCommand({ Bucket: S3_BUCKET_NAME, Key: key }));
};