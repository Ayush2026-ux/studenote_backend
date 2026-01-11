import { Request, Response } from "express";
import { PDFDocument } from "pdf-lib";
import { createNoteSchema } from "../../../validators/note.zod";
import NotesUpload from "../../../models/users/NotesUpload";
import { uploadToSupabase } from "../../../services/users/uploadnots.services";
import { promises as fs } from "fs";

/* =========================================================
   CREATE NOTE CONTROLLER
========================================================= */

export const createNote = async (
  req: Request & { user?: any; files?: any },
  res: Response
) => {
  try {
    /* ================= AUTH CHECK ================= */

    if (!req.user || !req.user._id) {
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
      return res.status(400).json({
        success: false,
        message: "Both thumbnail and PDF are required.",
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

    /* ================= PDF VALIDATION ================= */

    const header = pdfBuffer.toString("utf8", 0, 5);
    if (!header.startsWith("%PDF")) {
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
      return res.status(400).json({
        success: false,
        message: "PDF must have between 1 and 500 pages.",
      });
    }

    /* ================= UPLOAD TO SUPABASE ================= */

    const [thumbnailUrl, pdfUrl] = await Promise.all([
      uploadToSupabase(thumbnailFile, "thumbnails"),
      uploadToSupabase(pdfFile, "notes"),
    ]);

    /* ================= NORMALIZE DATA ================= */

    const normalizeSemester = (val: any) => {
      if (typeof val !== "string") return undefined;
      const cleaned = val.trim();
      if (
        cleaned === "" ||
        cleaned === "undefined" ||
        cleaned === "null"
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
      thumbnail: thumbnailUrl,
      file: pdfUrl,
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

    /* ================= RESPONSE ================= */

    return res.status(201).json({
      success: true,
      message: "Notes uploaded successfully",
      data: newNote,
    });
  } catch (error: any) {
    console.error("UPLOAD ERROR:", error);
    return res.status(400).json({
      success: false,
      message: error?.message || "Upload failed",
    });
  }
};



// ...existing code...


// export const createNote = async (req: Request & { user: any; files?: any; file?: any }, res: Response) => {
//     try {
//         // ensure authenticated user
//         if (!req.user || !req.user._id) {
//             return res.status(401).json({ success: false, message: "Unauthorized: user not found" });
//         }

//         const filesObj = (req.files as any) || {};
//         const thumbnailFile = filesObj.thumbnail?.[0] || (req.file && req.file.fieldname === "thumbnail" ? req.file : undefined);
//         const pdfFile = filesObj.file?.[0] || (req.file && (req.file.fieldname === "file" || req.file.fieldname === "pdf") ? req.file : undefined);

//         if (!thumbnailFile || !pdfFile) {
//             return res.status(400).json({ success: false, message: "Both thumbnail and PDF are required." });
//         }

//         // Obtain pdf buffer (support memoryStorage or diskStorage)
//         let pdfBuffer: Buffer | null = null;
//         if (pdfFile.buffer) {
//             pdfBuffer = pdfFile.buffer;
//         } else if (pdfFile.path) {
//             pdfBuffer = await fs.readFile(pdfFile.path);
//         } else {
//             return res.status(400).json({ success: false, message: "Unable to read uploaded PDF file." });
//         }

//         if (!pdfBuffer) {
//             return res.status(400).json({ success: false, message: "Unable to process PDF file." });
//         }

//         // PDF Header Check
//         const header = pdfBuffer.toString("utf8", 0, 5);
//         if (!header.startsWith("%PDF")) {
//             return res.status(400).json({ success: false, message: "Invalid PDF header." });
//         }

//         // Validate PDF Pages
//         const pdfDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
//         const actualPageCount = pdfDoc.getPageCount();

//         if (actualPageCount > 500) {
//             return res.status(400).json({ success: false, message: "PDF exceeds 500 pages limit." });
//         }

//         // Uploads
//         const [thumbnailUrl, pdfUrl] = await Promise.all([
//             uploadToSupabase(thumbnailFile, "thumbnails"),
//             uploadToSupabase(pdfFile, "notes")
//         ]);

//         // prepare data and include uploadedBy before/after validation to ensure it's set
//         const normalizeSemester = (value: any) => {
//             if (typeof value !== "string") return undefined;

//             const cleaned = value
//                 .replace(/\s+/g, " ") // collapse whitespace
//                 .trim();

//             if (
//                 cleaned === "" ||
//                 cleaned === "undefined" ||
//                 cleaned === "null"
//             ) {
//                 return undefined;
//             }

//             return cleaned;
//         };

//         const noteData = {
//             ...req.body,
//             semester: normalizeSemester(req.body.semester), // 🔥 FIX
//             price: Number(req.body.price),
//             pages: actualPageCount,
//             thumbnail: thumbnailUrl,
//             file: pdfUrl,
//             uploadedBy: req.user._id,
//         };

//         const validatedData = createNoteSchema.parse(noteData);

//         // ensure uploadedBy is present when saving (in case schema strips unknowns)
//         const noteToSave = {
//             ...validatedData,
//             uploadedBy: req.user._id,
//         };

//         const newNote = await NotesUpload.create(noteToSave);

//         res.status(201).json({ success: true, data: newNote });

//     } catch (error: any) {
//         console.error("Upload Error:", error);
//         res.status(400).json({
//             success: false,
//             error: error.message || "Upload failed"
//         });
//     }
// };



// ...existing code...