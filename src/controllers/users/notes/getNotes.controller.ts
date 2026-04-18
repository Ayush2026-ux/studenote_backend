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
    const noteId = req.params.id;
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const hasPurchased = await purchaseModel.exists({
      user: userId,
      note: noteId,
      status: "paid",
    });

    const note = await NotesUpload.findById(noteId)
      .select("file")
      .lean();

    if (!note?.file) {
      return res.status(404).json({
        message: "PDF not found",
      });
    }

    const signedUrl = await getS3SignedDownloadUrl(
      note.file,
      300,
      "application/pdf"
    );

    const pdfResponse = await axios.get(signedUrl, {
      responseType: "arraybuffer",
    });

    /// 🔥 IMPORTANT HEADERS
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'inline; filename="note.pdf"');

    /// 🔓 FULL PDF (purchased)
    if (hasPurchased) {
      return res.status(200).send(Buffer.from(pdfResponse.data));
    }

    /// 🔒 PREVIEW (5 pages)
    const original = await PDFDocument.load(pdfResponse.data);
    const preview = await PDFDocument.create();

    const pageCount = Math.min(5, original.getPageCount());

    const pages = await preview.copyPages(
      original,
      Array.from({ length: pageCount }, (_, i) => i)
    );

    pages.forEach((page) => preview.addPage(page));

    const previewBytes = await preview.save();

    return res.status(200).send(Buffer.from(previewBytes));
  } catch (err) {
    console.error("PREVIEW ERROR:", err);

    return res.status(500).json({
      message: "Preview failed",
      error: err,
    });
  }
};
