import { Request, Response } from "express";
import { PDFDocument } from "pdf-lib";
import { createNoteSchema } from "../../../validators/note.zod";
import NotesUpload from "../../../models/users/NotesUpload";
import { promises as fs } from "fs";

import {
  getS3SignedDownloadUrl,
  uploadToS3,
} from "../../../services/users/uploadnots.services";

/* ================= CONTROLLER ================= */

export const createNote = async (
  req: Request & { user?: any; files?: any },
  res: Response
) => {
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

    const thumbnailFile =
      filesObj?.thumbnail?.[0] ||
      filesObj?.image?.[0] ||
      filesObj?.cover?.[0];

    const pdfFile =
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

    let pdfBuffer: Buffer;

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

    try {
      const pdfDoc = await PDFDocument.load(pdfBuffer, {
        ignoreEncryption: true,
      });

      pageCount = pdfDoc.getPageCount();
    } catch {
      return res.status(400).json({
        success: false,
        message: "Failed to parse PDF",
      });
    }

    if (pageCount < 1 || pageCount > 500) {
      return res.status(400).json({
        success: false,
        message: "PDF must contain 1–500 pages",
      });
    }

    /* ================= UPLOAD FILES ================= */

    const [thumbRes, pdfRes] = await Promise.all([
      uploadToS3(thumbnailFile, "thumbnails", req.user._id),
      uploadToS3(pdfFile, "notes", req.user._id),
    ]);

    const thumbnailKey = thumbRes.key;
    const pdfKey = pdfRes.key;

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

    const thumbnailUrl = await getS3SignedDownloadUrl(
      thumbnailKey,
      3600,
      "image/jpeg"
    );

    const pdfUrl = await getS3SignedDownloadUrl(
      pdfKey,
      600,
      "application/pdf"
    );

    /* ================= SUCCESS RESPONSE ================= */

    return res.status(201).json({
      success: true,
      message: "Notes uploaded successfully.",
      data: {
        ...newNote.toObject(),
        thumbnailUrl,
        pdfUrl,
      },
    });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: error.errors,
      });
    }

    return res.status(500).json({
      success: false,
      message: error?.message || "Upload failed.",
    });
  }
};