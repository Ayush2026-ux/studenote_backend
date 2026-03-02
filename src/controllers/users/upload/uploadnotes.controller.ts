import { Request, Response } from "express";
import { PDFDocument } from "pdf-lib";
import { createNoteSchema } from "../../../validators/note.zod";
import NotesUpload from "../../../models/users/NotesUpload";
import { promises as fs } from "fs";
import {
  getS3SignedDownloadUrl,
  uploadToS3,
} from "../../../services/users/uploadnots.services";

/* =========================================================
   CREATE NOTE CONTROLLER (FINAL PRODUCTION VERSION)
========================================================= */

const UPLOAD_TIMEOUT = 1800000; // 30 minutes

export const createNote = async (
  req: Request & { user?: any; files?: any },
  res: Response
) => {
  try {
    /* ================= TIMEOUT ================= */

    req.setTimeout(UPLOAD_TIMEOUT);
    res.setTimeout(UPLOAD_TIMEOUT);

    /* ================= AUTH CHECK ================= */

    if (!req.user?._id) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized user",
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
        message: "Both thumbnail and PDF are required.",
      });
    }

    /* ================= FILE SIZE VALIDATION ================= */

    if (pdfFile.size > 150 * 1024 * 1024) {
      return res.status(413).json({
        success: false,
        message: "PDF file exceeds 150 MB limit.",
      });
    }

    if (thumbnailFile.size > 10 * 1024 * 1024) {
      return res.status(413).json({
        success: false,
        message: "Thumbnail exceeds 10 MB limit.",
      });
    }

    /* ================= READ PDF BUFFER ================= */

    let pdfBuffer: Buffer;

    if (pdfFile.buffer) {
      pdfBuffer = pdfFile.buffer;
    } else if (pdfFile.path) {
      pdfBuffer = await fs.readFile(pdfFile.path);
    } else {
      return res.status(400).json({
        success: false,
        message: "Unable to read uploaded PDF file.",
      });
    }

    /* ================= PDF HEADER VALIDATION ================= */

    const header = pdfBuffer.toString("utf8", 0, 5);
    if (!header.startsWith("%PDF")) {
      return res.status(400).json({
        success: false,
        message: "Invalid PDF file.",
      });
    }

    /* ================= PAGE COUNT VALIDATION ================= */

    let pageCount: number;

    try {
      const pdfDoc = await PDFDocument.load(pdfBuffer, {
        ignoreEncryption: true,
      });

      pageCount = pdfDoc.getPageCount();
    } catch (err) {
      return res.status(400).json({
        success: false,
        message: "Failed to parse PDF.",
      });
    }

    if (pageCount < 1 || pageCount > 500) {
      return res.status(400).json({
        success: false,
        message: "PDF must contain 1–500 pages.",
      });
    }

    /* ================= UPLOAD TO S3 ================= */

    let thumbnailKey: string;
    let pdfKey: string;

    try {
      const [thumbUpload, pdfUpload] = await Promise.all([
        uploadToS3(thumbnailFile, "thumbnails", req.user._id),
        uploadToS3(pdfFile, "notes", req.user._id),
      ]);

      thumbnailKey = thumbUpload.key;
      pdfKey = pdfUpload.key;
    } catch (uploadError: any) {
      return res.status(502).json({
        success: false,
        message:
          uploadError?.message || "Failed to upload files to storage.",
      });
    }

    /* ================= VALIDATE DATA ================= */

    const noteData = {
      title: String(req.body.title || "").trim(),
      description: String(req.body.description || "").trim(),
      course: String(req.body.course),
      subject: String(req.body.subject),
      semester: req.body.semester?.trim() || undefined,
      fileType: String(req.body.fileType),
      price: Number(req.body.price),
      pages: pageCount,
      thumbnail: thumbnailKey,
      file: pdfKey,
      university: req.body.university?.trim() || undefined,
      uploadedBy: req.user._id,
    };

    const validatedData = createNoteSchema.parse(noteData);

    /* ================= SAVE TO DATABASE ================= */

    const newNote = await NotesUpload.create(validatedData);

    /* ================= GENERATE SIGNED URLS ================= */

    const thumbnailUrl = await getS3SignedDownloadUrl(
      thumbnailKey,
      60 * 60
    );

    const pdfUrl = await getS3SignedDownloadUrl(
      pdfKey,
      60 * 10
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

    console.error("CREATE NOTE ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error?.message || "Upload failed.",
    });
  }
};