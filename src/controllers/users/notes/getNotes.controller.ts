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

    return res.status(200).json({ success: true, data: notesWithUrls });
  } catch (e) {
    console.error("GET PUBLIC NOTES ERROR:", e);
    return res.status(500).json({ success: false, message: "Failed" });
  }
};

/* ================= FULL PDF (OPTIONAL API) ================= */
export const downloadFullNotePdf = async (req: AuthRequest, res: Response) => {
  try {
    const noteId = req.params.id;
    const userId = req.user?._id;

    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const note = await NotesUpload.findById(noteId).select("file").lean();
    if (!note?.file) return res.status(404).json({ message: "Note not found" });

    const purchase = await purchaseModel.findOne({
      user: userId,
      note: noteId,
      status: "paid",
    });

    if (!purchase) return res.status(403).json({ message: "Not purchased" });

    const fileUrl = await getS3SignedDownloadUrl(
      note.file,
      60 * 5,
      "application/pdf"
    );

    return res.status(200).json({ success: true, fileUrl });
  } catch (e) {
    console.error("FULL PDF ERROR:", e);
    return res.status(500).json({ message: "Failed to fetch PDF" });
  }
};

/* ================= PREVIEW (SMART BEHAVIOUR) ================= */
export const previewNotePdf = async (req: AuthRequest, res: Response) => {
  try {
    const noteId = req.params.id;
    const userId = req.user?._id;

    const note = await NotesUpload.findById(noteId).select("file").lean();
    if (!note?.file) {
      return res.status(404).json({
        success: false,
        message: "PDF file not found for this note",
      });
    }

    const isPurchased = userId
      ? await purchaseModel.exists({
          user: userId,
          note: noteId,
          status: "paid",
        })
      : false;

    // 🔐 Signed URL
    const signedUrl = await getS3SignedDownloadUrl(
      note.file,
      60 * 5,
      "application/pdf"
    );

    // 🔥 Download PDF bytes from S3
    const pdfResponse = await axios.get(signedUrl, {
      responseType: "arraybuffer",
      timeout: 30000,
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      validateStatus: (s) => s >= 200 && s < 300,
    });

    // 🔥 Force inline rendering (prevents Android download manager)
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'inline; filename="note.pdf"');
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("X-Content-Type-Options", "nosniff");

    // 🔓 If purchased → FULL PDF
    if (isPurchased) {
      return res.status(200).send(Buffer.from(pdfResponse.data));
    }

    // 🔒 Not purchased → 10-page preview + watermark
    const original = await PDFDocument.load(pdfResponse.data);
    const preview = await PDFDocument.create();

    const font = await preview.embedFont(StandardFonts.HelveticaBold);
    const totalPages = original.getPageCount();
    const previewCount = Math.min(10, totalPages);

    const pages = await preview.copyPages(
      original,
      Array.from({ length: previewCount }, (_, i) => i)
    );

    pages.forEach((page) => preview.addPage(page));

    preview.getPages().forEach((page) => {
      const { width, height } = page.getSize();
      page.drawText("Studenote • Preview Only", {
        x: width * 0.15,
        y: height * 0.5,
        size: 28,
        rotate: degrees(-30),
        color: rgb(0.85, 0.85, 0.85),
        opacity: 0.3,
        font,
      });
    });

    const previewBytes = await preview.save();
    return res.status(200).send(Buffer.from(previewBytes));
  } catch (e: any) {
    console.error("PREVIEW ERROR:", {
      message: e?.message,
      status: e?.response?.status,
    });

    return res.status(500).json({ success: false, message: "Preview failed" });
  }
};