import { Request, Response } from "express";
import axios from "axios";
import NotesUpload from "../../../models/users/NotesUpload";
import purchaseModel from "../../../models/payments/purchase.model";
import { PDFDocument } from "pdf-lib";
import { getS3SignedDownloadUrl } from "../../../services/users/uploadnots.services";

interface AuthRequest extends Request {
  user?: { _id: string; fullName?: string };
}

/* ================= PUBLIC NOTES ================= */

export const getPublicNotes = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;

    const notes = await NotesUpload.find({ isActive: true })
      .sort({ createdAt: -1 })
      .lean();

    const notesWithStatus = await Promise.all(
      notes.map(async (note: any) => {
        const isBought = userId
          ? await purchaseModel.exists({
            user: userId,
            note: note._id,
            status: "paid",
          })
          : false;

        return {
          ...note,
          id: note._id.toString(),
          isBought: !!isBought,
          fileUrl: null,
        };
      })
    );

    return res.status(200).json({
      success: true,
      data: notesWithStatus,
    });
  } catch (e) {
    console.error("GET PUBLIC NOTES ERROR:", e);
    return res.status(500).json({ success: false });
  }
};

/* ================= PREVIEW NOTE PDF ================= */

export const previewNotePdf = async (req: AuthRequest, res: Response) => {
  try {
    console.log("---- PDF PREVIEW START ----");

    const noteId = req.params.id;
    const userId = req.user?._id;

    console.log("NOTE ID:", noteId);
    console.log("USER ID:", userId);

    if (!userId) {
      console.log("AUTH FAILED: req.user missing");
      return res.status(401).json({ message: "Unauthorized" });
    }

    const hasPurchased = await purchaseModel.exists({
      user: userId,
      note: noteId,
      status: "paid",
    });

    console.log("HAS PURCHASED:", hasPurchased);

    if (!hasPurchased) {
      console.log("PURCHASE CHECK FAILED");
      return res.status(403).json({
        message: "You have not purchased this note",
      });
    }

    const note = await NotesUpload.findById(noteId)
      .select("file")
      .lean();

    console.log("NOTE DB RESULT:", note);

    if (!note?.file) {
      console.log("FILE NOT FOUND IN DB");
      return res.status(404).json({
        message: "PDF not found",
      });
    }

    console.log("S3 FILE KEY:", note.file);

    const signedUrl = await getS3SignedDownloadUrl(
      note.file,
      60 * 5,
      "application/pdf"
    );

    const pdfResponse = await axios.get(signedUrl, {
      responseType: "arraybuffer",
      timeout: 30000,
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      validateStatus: (s: number) => s >= 200 && s < 300,
    });

    // 🔥 FORCE INLINE VIEW (ANDROID DOWNLOAD MANAGER FIX)
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'inline; filename="note.pdf"');
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("X-Content-Type-Options", "nosniff");

    // 🔓 Purchased → Full PDF
    if (hasPurchased) {
      return res.status(200).send(Buffer.from(pdfResponse.data));
    }

    // 🔒 Not purchased → Preview (10 pages)
    const original = await PDFDocument.load(pdfResponse.data);
    const preview = await PDFDocument.create();
    const pageCount = Math.min(10, original.getPageCount());
    const pages = await preview.copyPages(original, Array.from({ length: pageCount }, (_, i) => i));
    pages.forEach((page) => preview.addPage(page));
    const previewBytes = await preview.save();

    return res.status(200).send(Buffer.from(previewBytes));

  } catch (err) {
    console.error("---- PREVIEW ERROR ----");
    console.error(err);

    return res.status(500).json({
      message: "Preview failed",
      error: err,
    });
  }
};
