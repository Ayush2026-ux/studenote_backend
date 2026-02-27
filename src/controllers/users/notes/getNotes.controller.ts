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

    if (!userId)
      return res.status(401).json({ message: "Unauthorized" });

    const note = await NotesUpload.findById(noteId).select("file").lean();
    if (!note?.file)
      return res.status(404).json({ message: "PDF not found" });

    const isPurchased = await purchaseModel.exists({
      user: userId,
      note: noteId,
      status: "paid",
    });

    const signedUrl = await getS3SignedDownloadUrl(
      note.file,
      60,
      "application/pdf"
    );

    const pdfResponse = await axios.get(signedUrl, {
      responseType: "arraybuffer",
    });

    //  FORCE INLINE
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "inline");
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("X-Content-Type-Options", "nosniff");

    //  IF PURCHASED → FULL PDF
    if (isPurchased) {
      return res.send(Buffer.from(pdfResponse.data));
    }

    //  NOT PURCHASED → PREVIEW (10 PAGES + WATERMARK)
    const original = await PDFDocument.load(pdfResponse.data);
    const preview = await PDFDocument.create();

    const font = await preview.embedFont(StandardFonts.HelveticaBold);
    const totalPages = original.getPageCount();
    const previewCount = Math.min(10, totalPages);

    const pages = await preview.copyPages(
      original,
      Array.from({ length: previewCount }, (_, i) => i)
    );

    pages.forEach((p) => preview.addPage(p));

    preview.getPages().forEach((page) => {
      const { width, height } = page.getSize();

      page.drawText("Studenote Preview", {
        x: width * 0.2,
        y: height * 0.5,
        size: 30,
        rotate: degrees(-30),
        color: rgb(0.8, 0.8, 0.8),
        opacity: 0.4,
        font,
      });
    });

    const previewBytes = await preview.save();
    return res.send(Buffer.from(previewBytes));
  } catch (e) {
    console.error("PREVIEW ERROR:", e);
    return res.status(500).json({ message: "Preview failed" });
  }
};