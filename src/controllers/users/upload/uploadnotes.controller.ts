

import { Request, Response } from "express";
import { PDFDocument } from "pdf-lib";
import { createNoteSchema } from "../../../validators/note.zod";
import NotesUpload from "../../../models/users/NotesUpload";
import { promises as fs } from "fs";

import {
  getS3SignedDownloadUrl,
  uploadToS3,
  uploadBufferToS3,
  deleteFromS3,
} from "../../../services/users/uploadnots.services";

/* ================= CONSTANTS ================= */

/** Files above this threshold use lightweight page counting (avoids pdf-lib OOM) */
const LARGE_PDF_THRESHOLD = 50 * 1024 * 1024; // 50 MB

/** Maximum time allowed for pdf-lib parsing before aborting */
const PDF_PARSE_TIMEOUT_MS = 30_000; // 30 seconds

/* ================= HELPERS ================= */

/** Run a promise with a hard timeout */
const withTimeout = <T>(
  promise: Promise<T>,
  ms: number,
  message = "Operation timed out"
): Promise<T> =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    promise.then(
      (v) => { clearTimeout(timer); resolve(v); },
      (e) => { clearTimeout(timer); reject(e); }
    );
  });

/**
 * Lightweight PDF page counter using byte-pattern matching.
 * Counts "/Type /Page" entries (excluding "/Type /Pages" tree nodes).
 * Works directly on buffer bytes — zero extra string allocations.
 */
const countPagesLightweight = (buf: Buffer): number => {
  let count = 0;
  let offset = 0;

  while (offset < buf.length - 10) {
    const idx = buf.indexOf("/Type", offset);
    if (idx === -1) break;

    let i = idx + 5;
    // Skip whitespace between /Type and next token
    while (
      i < buf.length &&
      (buf[i] === 0x20 || buf[i] === 0x09 || buf[i] === 0x0a || buf[i] === 0x0d)
    ) {
      i++;
    }

    // Match "/Page" bytes: / P a g e  (0x2F 0x50 0x61 0x67 0x65)
    if (
      i + 5 <= buf.length &&
      buf[i] === 0x2f &&
      buf[i + 1] === 0x50 &&
      buf[i + 2] === 0x61 &&
      buf[i + 3] === 0x67 &&
      buf[i + 4] === 0x65
    ) {
      // Exclude "/Pages" — next byte must NOT be 's' (0x73)
      if (i + 5 >= buf.length || buf[i + 5] !== 0x73) {
        count++;
      }
    }

    offset = idx + 1;
  }

  return count;
};

/** Delete multer temp files silently */
const cleanupTempFiles = async (
  ...files: (Express.Multer.File | undefined)[]
) => {
  await Promise.allSettled(
    files
      .filter((f): f is Express.Multer.File => !!f?.path)
      .map((f) => fs.unlink(f.path))
  );
};

/** Roll back already-uploaded S3 objects silently */
const rollbackS3 = async (...keys: (string | undefined)[]) => {
  await Promise.allSettled(
    keys
      .filter((k): k is string => !!k)
      .map((k) => deleteFromS3(k))
  );
};

/* ================= CONTROLLER ================= */

export const createNote = async (
  req: Request & { user?: any; files?: any },
  res: Response
) => {
  // Declared outside try so catch/finally can access them for cleanup
  let thumbnailKey: string | undefined;
  let pdfKey: string | undefined;
  let thumbnailFile: Express.Multer.File | undefined;
  let pdfFile: Express.Multer.File | undefined;

  try {
    /* ================= CLIENT CHECK ================= */

    if (req.socket?.destroyed) return;

    /* ================= AUTH ================= */

    if (!req.user?._id) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    /* ================= FILE EXTRACTION ================= */

    const filesObj = req.files as {
      [key: string]: Express.Multer.File[];
    };

    thumbnailFile =
      filesObj?.thumbnail?.[0] ||
      filesObj?.image?.[0] ||
      filesObj?.cover?.[0];

    pdfFile =
      filesObj?.files?.[0] ||
      filesObj?.file?.[0] ||
      filesObj?.pdf?.[0] ||
      filesObj?.document?.[0];

    if (!thumbnailFile || !pdfFile) {
      return res.status(400).json({
        success: false,
        message: "Both thumbnail and PDF are required",
      });
    }

    /* ================= SIZE CHECK ================= */

    if (pdfFile.size > 150 * 1024 * 1024) {
      return res.status(413).json({
        success: false,
        message: "PDF exceeds 150MB limit",
      });
    }

    if (thumbnailFile.size > 10 * 1024 * 1024) {
      return res.status(413).json({
        success: false,
        message: "Thumbnail exceeds 10MB limit",
      });
    }

    /* ================= READ PDF ================= */

    let pdfBuffer: Buffer | null;

    if (pdfFile.buffer) {
      pdfBuffer = pdfFile.buffer;
    } else if (pdfFile.path) {
      pdfBuffer = await fs.readFile(pdfFile.path);
    } else {
      return res.status(400).json({
        success: false,
        message: "Unable to read PDF",
      });
    }

    /* ================= VALIDATE PDF ================= */

    const header = pdfBuffer.toString("utf8", 0, 5);

    if (!header.startsWith("%PDF")) {
      return res.status(400).json({
        success: false,
        message: "Invalid PDF file",
      });
    }

    let pageCount = 0;

    if (pdfBuffer.length > LARGE_PDF_THRESHOLD) {
      /* --- Large file (>50 MB): lightweight byte-level page count (no OOM risk) --- */
      pageCount = countPagesLightweight(pdfBuffer);
    } else {
      /* --- Normal file: precise pdf-lib page count with timeout guard --- */
      try {
        const pdfDoc = await withTimeout(
          PDFDocument.load(pdfBuffer, { ignoreEncryption: true }),
          PDF_PARSE_TIMEOUT_MS,
          "PDF parsing timed out"
        );
        pageCount = pdfDoc.getPageCount();
      } catch {
        return res.status(400).json({
          success: false,
          message: "Failed to parse PDF",
        });
      }
    }

    if (pageCount < 1 || pageCount > 500) {
      return res.status(400).json({
        success: false,
        message: "PDF must contain 1–500 pages",
      });
    }

    /* ================= ABORT CHECK BEFORE S3 ================= */

    if (req.socket?.destroyed) return;

    /* ================= UPLOAD FILES ================= */

    const [thumbRes, pdfRes] = await Promise.all([
      uploadToS3(thumbnailFile, "thumbnails", req.user._id),
      // Pass pre-loaded buffer directly — avoids re-reading PDF from disk
      uploadBufferToS3(pdfBuffer, pdfFile, "notes", req.user._id),
    ]);

    thumbnailKey = thumbRes.key;
    pdfKey = pdfRes.key;

    // Release the buffer so GC can reclaim memory immediately
    pdfBuffer = null;

    /* ================= BUILD DATA ================= */

    const noteData = {
      title: req.body.title?.trim(),
      description: req.body.description?.trim(),
      course: req.body.course?.trim(),
      subject: req.body.subject?.trim(),
      semester: req.body.semester?.trim() || undefined,
      fileType: req.body.fileType?.trim(),
      price: req.body.price ? Number(req.body.price) : 0,
      pages: pageCount,
      thumbnail: thumbnailKey,
      file: pdfKey,
      university: req.body.university?.trim() || undefined,
      uploadedBy: req.user._id,
    };

    /* ================= VALIDATE ================= */

    const validatedData = createNoteSchema.parse(noteData);

    /* ================= SAVE ================= */

    const newNote = await NotesUpload.create(validatedData);

    /* ================= SIGNED URLS ================= */

    const [thumbnailUrl, pdfUrl] = await Promise.all([
      getS3SignedDownloadUrl(thumbnailKey, 3600, "image/jpeg"),
      getS3SignedDownloadUrl(pdfKey, 600, "application/pdf"),
    ]);

    return res.status(201).json({
      success: true,
      message: "Notes uploaded successfully",
      data: {
        ...newNote.toObject(),
        thumbnailUrl,
        pdfUrl,
      },
    });
  } catch (error: any) {
    /* ================= ROLLBACK S3 ON FAILURE ================= */

    await rollbackS3(thumbnailKey, pdfKey);

    if (error.name === "ZodError") {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: error.errors,
      });
    }

    return res.status(500).json({
      success: false,
      message: error?.message || "Upload failed",
    });
  } finally {
    /* ================= ALWAYS CLEANUP TEMP FILES ================= */

    await cleanupTempFiles(thumbnailFile, pdfFile);
  }
};