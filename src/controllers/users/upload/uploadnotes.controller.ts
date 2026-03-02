import { Request, Response } from "express";
import { PDFDocument } from "pdf-lib";
import { createNoteSchema } from "../../../validators/note.zod";
import NotesUpload from "../../../models/users/NotesUpload";
import { promises as fs } from "fs";
import {
  getS3SignedDownloadUrl,
  uploadToS3,
} from "../../../services/users/uploadnots.services";

import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import os from "os";

const execAsync = promisify(exec);

/* ================= PDF COMPRESSION FUNCTION ================= */

const compressPdf = async (inputPath: string, outputPath: string) => {
  const isWindows = process.platform === "win32";

  const gsCommand = isWindows
    ? `"C:\\Program Files\\gs\\gs10.06.0\\bin\\gswin64c.exe"`
    : "gs";

  const command = `
  ${gsCommand} -sDEVICE=pdfwrite
  -dCompatibilityLevel=1.4
  -dPDFSETTINGS=/ebook
  -dNOPAUSE
  -dQUIET
  -dBATCH
  -sOutputFile="${outputPath}"
  "${inputPath}"
  `;

  await execAsync(command);
};

/* =========================================================
   CREATE NOTE CONTROLLER (WITH AUTO PDF COMPRESSION)
========================================================= */

const UPLOAD_TIMEOUT = 1800000;
const KEEP_ALIVE_TIMEOUT = 65000;

export const createNote = async (
  req: Request & { user?: any; files?: any },
  res: Response
) => {
  req.setTimeout(UPLOAD_TIMEOUT);
  res.setTimeout(UPLOAD_TIMEOUT);

  res.setHeader("Connection", "keep-alive");
  res.setHeader("Keep-Alive", `timeout=${KEEP_ALIVE_TIMEOUT / 1000}`);

  if (req.socket) req.socket.setKeepAlive(true, 60000);

  const heartbeatInterval = setInterval(() => {
    if (!res.writableEnded) res.write("");
  }, 20000);

  try {
    /* ================= AUTH ================= */

    if (!req.user?._id) {
      clearInterval(heartbeatInterval);
      return res.status(401).json({
        success: false,
        message: "Unauthorized: user not found",
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
      clearInterval(heartbeatInterval);
      return res.status(400).json({
        success: false,
        message: "Both thumbnail and PDF are required.",
      });
    }

    /* ================= SIZE CHECK ================= */

    if (pdfFile.size > 150 * 1024 * 1024) {
      clearInterval(heartbeatInterval);
      return res.status(413).json({
        success: false,
        message: "PDF file exceeds 150 MB limit",
      });
    }

    /* ================= READ PDF ================= */

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

    /* ================= VALIDATE PDF ================= */

    const header = pdfBuffer.toString("utf8", 0, 5);
    if (!header.startsWith("%PDF")) {
      clearInterval(heartbeatInterval);
      return res.status(400).json({
        success: false,
        message: "Invalid PDF file.",
      });
    }

    const pdfDoc = await PDFDocument.load(pdfBuffer, {
      ignoreEncryption: true,
    });

    const pageCount = pdfDoc.getPageCount();

    if (pageCount < 1 || pageCount > 500) {
      clearInterval(heartbeatInterval);
      return res.status(400).json({
        success: false,
        message: "PDF must have 1–500 pages.",
      });
    }

    /* ================= PDF COMPRESSION ================= */

    const tempDir = os.tmpdir();
    const inputPath = path.join(tempDir, `input_${Date.now()}.pdf`);
    const outputPath = path.join(tempDir, `compressed_${Date.now()}.pdf`);

    await fs.writeFile(inputPath, pdfBuffer);

    await compressPdf(inputPath, outputPath);

    const compressedBuffer = await fs.readFile(outputPath);

    console.log(
      `📦 Compression: ${(pdfBuffer.length / 1024 / 1024).toFixed(2)}MB → ${(compressedBuffer.length / 1024 / 1024).toFixed(2)}MB`
    );

    /* ================= UPLOAD TO S3 ================= */

    const [thumbRes, pdfRes] = await Promise.all([
      uploadToS3(thumbnailFile, "thumbnails", req.user._id),
      uploadToS3(
        {
          ...pdfFile,
          buffer: compressedBuffer,
          size: compressedBuffer.length,
        } as any,
        "notes",
        req.user._id
      ),
    ]);

    /* ================= CLEAN TEMP ================= */

    await fs.unlink(inputPath).catch(() => {});
    await fs.unlink(outputPath).catch(() => {});

    /* ================= SAVE ================= */

    const noteData = {
      title: String(req.body.title || "").trim(),
      description: String(req.body.description || "").trim(),
      course: String(req.body.course),
      subject: String(req.body.subject),
      semester: req.body.semester?.trim() || undefined,
      fileType: String(req.body.fileType),
      price: Number(req.body.price),
      pages: pageCount,
      thumbnail: thumbRes.key,
      file: pdfRes.key,
      university: req.body.university?.trim() || undefined,
      uploadedBy: req.user._id,
    };

    const validatedData = createNoteSchema.parse(noteData);

    const newNote = await NotesUpload.create(validatedData);

    clearInterval(heartbeatInterval);

    /* ================= RETURN URLS ================= */

    const thumbnailUrl = await getS3SignedDownloadUrl(
      thumbRes.key,
      60 * 60,
      "image/jpeg"
    );

    const pdfUrl = await getS3SignedDownloadUrl(
      pdfRes.key,
      60 * 10,
      "application/pdf"
    );

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

    return res.status(500).json({
      success: false,
      message: error?.message || "Upload failed",
    });
  }
};