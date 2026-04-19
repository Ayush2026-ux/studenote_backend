import { Request, Response } from "express";
import axios from "axios";
import { PDFDocument } from "pdf-lib";
import NotesUpload from "../../models/users/NotesUpload";
import Purchase from "../../models/payments/purchase.model";
import { getS3SignedDownloadUrl } from "../../services/users/uploadnots.services";

interface AuthRequest extends Request {
  user?: { _id: string };
}

export const previewNotePdf = async (req: AuthRequest, res: Response) => {
  try {
    const noteId = req.params.id;
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    // 🔎 Get note
    const note = await NotesUpload.findById(noteId)
      .select("file uploadedBy")
      .lean();

    if (!note?.file) {
      return res.status(404).json({
        success: false,
        message: "PDF not found",
      });
    }

    // 🔐 Check access (owner or purchased)
    let isBought = false;

    if (note.uploadedBy?.toString() === userId.toString()) {
      isBought = true;
    } else {
      const purchase = await Purchase.findOne({
        user: userId,
        note: noteId,
        status: "paid",
      });

      if (purchase) isBought = true;
    }

    // 🔗 Get signed URL from S3
    const signedUrl = await getS3SignedDownloadUrl(
      note.file,
      900,
      "application/pdf"
    );

    // 📥 Fetch PDF as buffer
    const pdfResponse = await axios.get(signedUrl, {
      responseType: "arraybuffer",
    });

    // 🔥 Important headers
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'inline; filename="note.pdf"');

    // ✅ If bought → full PDF
    if (isBought) {
      return res.status(200).send(Buffer.from(pdfResponse.data));
    }

    // 🔒 Else → preview (first 5 pages)
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
  } catch (error) {
    console.error("Preview Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to generate preview",
    });
  }
};