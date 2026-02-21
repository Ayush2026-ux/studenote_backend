import { Request, Response } from "express";
import { PDFDocument } from "pdf-lib";
import { createNoteSchema } from "../../../validators/note.zod";
import NotesUpload from "../../../models/users/NotesUpload";
import { promises as fs } from "fs";
import { getS3SignedDownloadUrl, uploadToS3 } from "../../../services/users/uploadnots.services";


/* =========================================================
   CREATE NOTE CONTROLLER (S3 VERSION)
========================================================= */

const UPLOAD_TIMEOUT = 1800000; // 30 minutes for very large files (80MB+)
const KEEP_ALIVE_TIMEOUT = 65000; // Send keep-alive every 65 seconds

export const createNote = async (
  req: Request & { user?: any; files?: any },
  res: Response
) => {
  // Set longer timeout for large file uploads
  req.setTimeout(UPLOAD_TIMEOUT);
  res.setTimeout(UPLOAD_TIMEOUT);

  // Keep connection alive
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Keep-Alive", `timeout=${KEEP_ALIVE_TIMEOUT / 1000}`);

  // Keep TCP connection alive
  if (req.socket) {
    req.socket.setKeepAlive(true, 60000);
  }

  // Send periodic heartbeat to prevent timeout
  const heartbeatInterval = setInterval(() => {
    if (!res.writableEnded) res.write("");
  }, 20000);

  try {
    /* ================= AUTH CHECK ================= */
    if (!req.user || !req.user._id) {
      clearInterval(heartbeatInterval);
      return res.status(401).json({
        success: false,
        message: "Unauthorized: user not found",
      });
    }

    /* ================= FILE EXTRACTION ================= */
    const filesObj = req.files as { [key: string]: Express.Multer.File[] };

    const thumbnailFile =
      filesObj?.thumbnail?.[0] || filesObj?.image?.[0] || filesObj?.cover?.[0];
    const pdfFile =
      filesObj?.files?.[0] ||
      filesObj?.file?.[0] ||
      filesObj?.pdf?.[0] ||
      filesObj?.document?.[0];

    if (!thumbnailFile || !pdfFile) {
      clearInterval(heartbeatInterval);
      return res.status(400).json({
        success: false,
        message: "Both thumbnail and PDF are required.",
      });
    }

    /* ================= FILE SIZE VALIDATION ================= */
    if (pdfFile.size > 150 * 1024 * 1024) {
      clearInterval(heartbeatInterval);
      return res.status(413).json({
        success: false,
        message: "PDF file exceeds 150 MB limit",
      });
    }

    if (thumbnailFile.size > 10 * 1024 * 1024) {
      clearInterval(heartbeatInterval);
      return res.status(413).json({
        success: false,
        message: "Thumbnail exceeds 10 MB limit",
      });
    }

    /* ================= READ PDF BUFFER ================= */
    let pdfBuffer: Buffer;

    if (pdfFile.buffer) {
      pdfBuffer = pdfFile.buffer;
    } else if (pdfFile.path) {
      pdfBuffer = await fs.readFile(pdfFile.path);
    } else {
      clearInterval(heartbeatInterval);
      return res.status(400).json({
        success: false,
        message: "Unable to read uploaded PDF file.",
      });
    }

    /* ================= PDF VALIDATION ================= */
    const header = pdfBuffer.toString("utf8", 0, 5);
    if (!header.startsWith("%PDF")) {
      clearInterval(heartbeatInterval);
      return res.status(400).json({
        success: false,
        message: "Invalid PDF file.",
      });
    }

    let pageCount: number;
    try {
      const pdfDoc = await PDFDocument.load(pdfBuffer, {
        ignoreEncryption: true,
      });
      pageCount = pdfDoc.getPageCount();
    } catch (pdfError: any) {
      console.error("PDF parsing error:", pdfError);
      clearInterval(heartbeatInterval);
      return res.status(400).json({
        success: false,
        message: "Failed to parse PDF. File may be corrupted or encrypted.",
      });
    }

    if (pageCount < 1 || pageCount > 500) {
      clearInterval(heartbeatInterval);
      return res.status(400).json({
        success: false,
        message: "PDF must have between 1 and 500 pages.",
      });
    }

    /* ================= UPLOAD TO S3 ================= */
    let thumbnailKey: string;
    let pdfKey: string;

    try {
      console.log(
        `Uploading files to S3: Thumbnail (${thumbnailFile.size} bytes), PDF (${pdfFile.size} bytes)`
      );

      const [thumbRes, pdfRes] = await Promise.all([
        uploadToS3(thumbnailFile, "thumbnails", req.user._id),
        uploadToS3(pdfFile, "notes", req.user._id),
      ]);

      thumbnailKey = thumbRes.key;
      pdfKey = pdfRes.key;

      console.log("Files uploaded successfully to S3");
    } catch (uploadError: any) {
      console.error("S3 upload error:", uploadError);
      clearInterval(heartbeatInterval);
      return res.status(502).json({
        success: false,
        message: uploadError?.message || "Failed to upload files to S3",
      });
    }

    /* ================= NORMALIZE DATA ================= */
    const normalizeSemester = (val: any) => {
      if (typeof val !== "string") return undefined;
      const cleaned = val.trim();
      if (
        cleaned === "" ||
        cleaned.toLowerCase() === "undefined" ||
        cleaned.toLowerCase() === "null"
      ) {
        return undefined;
      }
      return cleaned;
    };

    const noteData = {
      title: String(req.body.title || "").trim(),
      description: String(req.body.description || "").trim(),
      course: String(req.body.course),
      subject: String(req.body.subject),
      semester: normalizeSemester(req.body.semester),
      fileType: String(req.body.fileType),
      price: Number(req.body.price),
      pages: pageCount,
      thumbnail: thumbnailKey, // store S3 key
      file: pdfKey,           // store S3 key
      university: req.body.university?.trim() || undefined,
      uploadedBy: req.user._id,
    };

    /* ================= VALIDATION ================= */
    const validatedData = createNoteSchema.parse(noteData);

    /* ================= SAVE ================= */
    const newNote = await NotesUpload.create({
      ...validatedData,
      uploadedBy: req.user._id,
    });

    clearInterval(heartbeatInterval);

    /* ================= OPTIONAL: RETURN PREVIEW URLS ================= */
    const thumbnailUrl = await getS3SignedDownloadUrl(thumbnailKey, 60 * 60); // 1 hour
    const pdfUrl = await getS3SignedDownloadUrl(pdfKey, 60 * 10); // 10 min

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
    clearInterval(heartbeatInterval);
    console.error("UPLOAD ERROR:", error);

    if (error.name === "ZodError") {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: error.errors,
      });
    }

    if (error.code === "ETIMEDOUT" || error.message?.includes("timeout")) {
      return res.status(408).json({
        success: false,
        message: "Upload timeout. Please try again.",
      });
    }

    return res.status(400).json({
      success: false,
      message: error?.message || "Upload failed",
    });
  }
};