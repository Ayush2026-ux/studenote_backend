import { Request, Response } from "express";
import NotesUpload from "../../../models/users/NotesUpload";
import purchaseModel from "../../../models/payments/purchase.model";
import { getS3SignedDownloadUrl } from "../../../services/users/uploadnots.services";
import axios from "axios";
import { PDFDocument, rgb, StandardFonts, degrees } from "pdf-lib";

interface AuthRequest extends Request {
  user?: { _id: string; fullName?: string };
}

export const getPublicNotes = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;

    const notes = await NotesUpload.find({ isActive: true })
      .sort({ createdAt: -1 })
      .lean();

    const notesWithUrls = await Promise.all(
      notes.map(async (note: any) => {
        let thumbnailUrl: string | null = null;
        let fileUrl: string | null = null;
        let isBought = false;

        if (note.thumbnail) {
          thumbnailUrl = await getS3SignedDownloadUrl(
            note.thumbnail,
            60 * 60,
            "image/jpeg"
          );
        }

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

    return res.status(200).json({
      success: true,
      data: notesWithUrls,
    });
  } catch (error) {
    console.error("GET PUBLIC NOTES ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch notes",
    });
  }
};


// 🔓 Full PDF download (only after purchase)
export const downloadFullNotePdf = async (req: AuthRequest, res: Response) => {
  try {
    const noteId = req.params.id;
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const note = await NotesUpload.findById(noteId);
    if (!note || !note.file) {
      return res.status(404).json({ message: "Note not found" });
    }

    const purchase = await purchaseModel.findOne({
      user: userId,
      note: noteId,
      status: "paid",
    });

    if (!purchase) {
      return res.status(403).json({
        message: "You must purchase this note to access full PDF",
      });
    }

    // 🔐 Short-lived signed URL for security
    const fullUrl = await getS3SignedDownloadUrl(
      note.file,
      60 * 5, // 5 minutes
      "application/pdf"
    );

    // 🔥 In-app viewer ke liye direct URL bhejo
    return res.status(200).json({
      success: true,
      fileUrl: fullUrl,
    });
  } catch (error) {
    console.error("FULL PDF DOWNLOAD ERROR:", error);
    return res.status(500).json({ message: "Failed to fetch full PDF" });
  }
};

export const previewNotePdf = async (req: AuthRequest, res: Response) => {
  try {
    const noteId = req.params.id;
    const userId = req.user?._id;

    const note = await NotesUpload.findById(noteId);
    if (!note || !note.file) {
      return res.status(404).json({ message: "Note not found" });
    }

    if (userId) {
      const purchase = await purchaseModel.findOne({
        user: userId,
        note: noteId,
        status: "paid",
      });

      if (purchase) {
        return res.status(403).json({
          message: "Already purchased. Use full file endpoint.",
        });
      }
    }

    const fullUrl = await getS3SignedDownloadUrl(
      note.file,
      60 * 2,
      "application/pdf"
    );

    const pdfBuffer = (
      await axios.get(fullUrl, { responseType: "arraybuffer" })
    ).data;

    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const previewDoc = await PDFDocument.create();

    const pages = pdfDoc.getPages().slice(0, 10);
    const font = await previewDoc.embedFont(StandardFonts.HelveticaBold);

    for (let i = 0; i < pages.length; i++) {
      const [copiedPage] = await previewDoc.copyPages(pdfDoc, [i]);
      const { width, height } = copiedPage.getSize();

      copiedPage.drawText("Preview Only • studenote", {
        x: width / 2 - 120,
        y: height / 2,
        size: 22,
        font,
        color: rgb(1, 0, 0),
        opacity: 0.2,
        rotate: degrees(-35), // ✅ FIXED
      });

      previewDoc.addPage(copiedPage);
    }

    const bytes = await previewDoc.save();

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate"
    );
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");

    return res.send(Buffer.from(bytes));
  } catch (error) {
    console.error("PREVIEW PDF ERROR:", error);
    return res.status(500).json({ message: "Failed to load preview PDF" });
  }
};