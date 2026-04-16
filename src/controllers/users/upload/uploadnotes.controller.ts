import { Request, Response } from "express";
import { createNoteSchema } from "../../../validators/note.zod";
import NotesUpload from "../../../models/users/NotesUpload";
import { promises as fs } from "fs";

import {
  getS3SignedDownloadUrl,
  uploadToS3,
  uploadFileStreamToS3,
  deleteFromS3,
} from "../../../services/users/uploadnots.services";

/* ================= CLEANUP ================= */

const cleanupTempFiles = async (
  ...files: (Express.Multer.File | undefined)[]
) => {
  await Promise.allSettled(
    files
      .filter((f): f is Express.Multer.File => !!f?.path)
      .map((f) => fs.unlink(f.path))
  );
};

const rollbackS3 = async (...keys: (string | undefined)[]) => {
  await Promise.allSettled(
    keys.filter(Boolean).map((k) => deleteFromS3(k!))
  );
};

/* ================= CONTROLLER ================= */

export const createNote = async (
  req: Request & { user?: any; files?: any },
  res: Response
) => {
  let thumbnailKey: string | undefined;
  let pdfKey: string | undefined;
  let thumbnailFile: Express.Multer.File | undefined;
  let pdfFile: Express.Multer.File | undefined;

  try {
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
      filesObj?.image?.[0];

    pdfFile =
      filesObj?.files?.[0] ||
      filesObj?.file?.[0];

    if (!thumbnailFile || !pdfFile) {
      return res.status(400).json({
        success: false,
        message: "Thumbnail and PDF required",
      });
    }

    /* ================= SIZE LIMIT (SAFE FOR RAILWAY) ================= */

    if (pdfFile.size > 20 * 1024 * 1024) {
      return res.status(413).json({
        success: false,
        message: "PDF max size is 20MB",
      });
    }

    if (thumbnailFile.size > 5 * 1024 * 1024) {
      return res.status(413).json({
        success: false,
        message: "Thumbnail max size is 5MB",
      });
    }

    /* ================= BODY VALIDATION ================= */

    const noteData = {
      title: req.body.title?.trim(),
      description: req.body.description?.trim(),
      course: req.body.course?.trim(),
      subject: req.body.subject?.trim(),
      semester: req.body.semester?.trim() || undefined,
      fileType: req.body.fileType?.trim(),
      price: req.body.price ? Number(req.body.price) : 0,
      pages: 1, // 🚀 NO HEAVY PDF PARSING
      university: req.body.university?.trim() || undefined,
      uploadedBy: req.user._id,
      thumbnail: "temp",
      file: "temp",
    };

    const validated = createNoteSchema.safeParse(noteData);

    if (!validated.success) {
      return res.status(400).json({
        success: false,
        message: validated.error.issues[0]?.message,
      });
    }

    /* ================= UPLOAD TO S3 (FAST) ================= */

    const [thumbRes, pdfRes] = await Promise.all([
      uploadToS3(thumbnailFile, "thumbnails", req.user._id),
      uploadFileStreamToS3(pdfFile.path, pdfFile, "notes", req.user._id),
    ]);

    thumbnailKey = thumbRes.key;
    pdfKey = pdfRes.key;

    /* ================= SAVE ================= */

    const newNote = await NotesUpload.create({
      ...noteData,
      thumbnail: thumbnailKey,
      file: pdfKey,
      status: "pending", // 🔥 IMPORTANT
    });

    /* ================= SIGNED URL ================= */

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
    await rollbackS3(thumbnailKey, pdfKey);

    return res.status(500).json({
      success: false,
      message: error?.message || "Upload failed",
    });
  } finally {
    await cleanupTempFiles(thumbnailFile, pdfFile);
  }
};