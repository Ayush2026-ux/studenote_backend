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

    const notesWithUrls = await Promise.all(
      notes.map(async (note: any) => {
        const thumbnailUrl = note.thumbnail
          ? await getS3SignedDownloadUrl(note.thumbnail, 60 * 60, "image/jpeg")
          : null;

        let isBought = false;
        let fileUrl: string | null = null;

        if (userId) {
          const purchase = await purchaseModel.findOne({
            user: userId,
            note: note._id,
            status: "paid",
          });
          isBought = !!purchase;
        }

        if (note.file && isBought) {
          fileUrl = await getS3SignedDownloadUrl(
            note.file,
            60 * 5,
            "application/pdf"
          );
        }

        return {
          ...note,
          id: note._id.toString(),
          thumbnailUrl,
          fileUrl,
          isBought,
        };
      })
    );

    return res.json({ success: true, data: notesWithUrls });
  } catch (e) {
    console.error("GET PUBLIC NOTES ERROR:", e);
    return res.status(500).json({ success: false, message: "Failed" });
  }
};

/* ================= FULL PDF ================= */
export const downloadFullNotePdf = async (req: AuthRequest, res: Response) => {
  try {
    const noteId = req.params.id;
    const userId = req.user?._id;

    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const note = await NotesUpload.findById(noteId);
    if (!note?.file) return res.status(404).json({ message: "Note not found" });

    const purchase = await purchaseModel.findOne({
      user: userId,
      note: noteId,
      status: "paid",
    });

    if (!purchase)
      return res.status(403).json({ message: "Not purchased" });

    const fileUrl = await getS3SignedDownloadUrl(
      note.file,
      60 * 5,
      "application/pdf"
    );

    return res.json({ success: true, fileUrl });
  } catch (e) {
    console.error("FULL PDF ERROR:", e);
    return res.status(500).json({ message: "Failed to fetch PDF" });
  }
};

/* ================= PREVIEW ================= */
export const previewNotePdf = async (req: AuthRequest, res: Response) => {
  try {
    const noteId = req.params.id;
    const userId = req.user?._id;

    const note = await NotesUpload.findById(noteId);
    if (!note?.file) {
      return res.status(404).json({ message: "No preview available" });
    }

    // ❌ If already bought → block preview
    if (userId) {
      const purchased = await purchaseModel.findOne({
        user: userId,
        note: noteId,
        status: "paid",
      });
      if (purchased) {
        return res.status(403).json({ message: "Already purchased" });
      }
    }

    const fullUrl = await getS3SignedDownloadUrl(
      note.file,
      60 * 5,
      "application/pdf"
    );

    const pdfBuffer = (
      await axios.get(fullUrl, { responseType: "arraybuffer" })
    ).data;

    const original = await PDFDocument.load(pdfBuffer);
    const preview = await PDFDocument.create();

    const font = await preview.embedFont(StandardFonts.HelveticaBold);
    const pages = original.getPages().slice(0, 10);

    for (let i = 0; i < pages.length; i++) {
      const [p] = await preview.copyPages(original, [i]);
      const { width, height } = p.getSize();

      p.drawText("Studenote • Preview Only", {
        x: width * 0.15,
        y: height * 0.5,
        size: 26,
        rotate: degrees(-30),
        color: rgb(1, 0, 0),
        opacity: 0.2,
        font,
      });

      preview.addPage(p);
    }

    const bytes = await preview.save();

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");

    return res.send(Buffer.from(bytes));
  } catch (e) {
    console.error("PREVIEW ERROR:", e);
    return res.status(500).json({ message: "Preview failed" });
  }
};