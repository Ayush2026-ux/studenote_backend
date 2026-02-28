import { Request, Response } from "express";
import NotesUpload from "../../../models/users/NotesUpload";
import purchaseModel from "../../../models/payments/purchase.model";
import { getS3SignedDownloadUrl } from "../../../services/users/uploadnots.services";
import axios from "axios";
import { PDFDocument, rgb, StandardFonts, degrees } from "pdf-lib";

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
          fileUrl: null, //  NEVER SEND FILE URL
        };
      })
    );

    return res.status(200).json({ success: true, data: notesWithStatus });
  } catch (e) {
    console.error("GET PUBLIC NOTES ERROR:", e);
    return res.status(500).json({ success: false });
  }
};

/* ================= SECURE PREVIEW + FULL STREAM ================= */
export const previewNotePdf = async (req: AuthRequest, res: Response) => {
  try {
    const noteId = req.params.id;
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const note = await NotesUpload.findById(noteId).select("file").lean();
    if (!note?.file) {
      return res.status(404).json({ message: "PDF not found" });
    }

    const isPurchased = await purchaseModel.exists({
      user: userId,
      note: noteId,
      status: "paid",
    });

    const signedUrl = await getS3SignedDownloadUrl(
      note.file,
      300, // 5 min expiry
      "application/pdf"
    );

    return res.json({
      success: true,
      isPurchased: !!isPurchased,
      url: signedUrl,
    });
  } catch (e) {
    console.error("PREVIEW ERROR:", e);
    return res.status(500).json({ message: "Preview failed" });
  }
};