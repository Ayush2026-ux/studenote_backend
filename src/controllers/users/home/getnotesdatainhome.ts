import { Request, Response } from "express";
import { PDFDocument, rgb, degrees } from "pdf-lib";
import NotesUpload from "../../../models/users/NotesUpload";
import axios from "axios";
import purchaseModel from "../../../models/payments/purchase.model";
import { getS3SignedDownloadUrl } from "../../../services/users/uploadnots.services";

// ================== GET ALL NOTES FOR HOME ==================
export const getAllNotes = async (req: Request, res: Response) => {
  try {
    const { fileType, sort, search, page = "1", limit = "10" } = req.query;

    const pageNum = Math.max(parseInt(page as string), 1);
    const limitNum = Math.min(parseInt(limit as string), 20);
    const skip = (pageNum - 1) * limitNum;

    const query: any = { status: "approved" };

    if (fileType) query.fileType = fileType;

    if (search) {
      const searchRegex = new RegExp(search as string, "i");
      query.$or = [
        { title: searchRegex },
        { description: searchRegex },
        { subject: searchRegex },
        { course: searchRegex },
      ];
    }

    let notesQuery = NotesUpload.find(query)
      .populate("uploadedBy", "fullName avatar")
      .select(
        "title description subject course semester fileType price pages thumbnail rating uploadedBy createdAt"
      )
      .skip(skip)
      .limit(limitNum)
      .lean();

    notesQuery =
      sort === "rating"
        ? notesQuery.sort({ rating: -1 })
        : notesQuery.sort({ createdAt: -1 });

    const [notes, total] = await Promise.all([
      notesQuery,
      NotesUpload.countDocuments(query),
    ]);

    const formattedNotes = await Promise.all(
      notes.map(async (note: any) => {
        const thumbnailUrl = note.thumbnail
          ? await getS3SignedDownloadUrl(note.thumbnail, 60 * 60, "image/jpeg")
          : null;

        return {
          id: note._id.toString(),
          title: note.title,
          description: note.description,
          course: note.course,
          subject: note.subject,
          semester: note.semester || "N/A",
          fileType: note.fileType,
          price: note.price,
          isLocked: true,
          thumbnailUrl,
          pages: note.pages ?? 1,
          author: note.uploadedBy?.fullName || "Unknown",
          authorAvatar: note.uploadedBy?.avatar || null,
          rating: note.rating ?? 0,
          createdAt: note.createdAt,
        };
      })
    );

    return res.status(200).json({
      success: true,
      meta: { total, page: pageNum, limit: limitNum },
      data: formattedNotes,
    });
  } catch (error) {
    console.error("GET NOTES ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

// ================== PREVIEW ==================

interface AuthRequest extends Request {
  user?: { _id: string };
}

export const getNotePreview = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?._id;

    const note = await NotesUpload.findById(id)
      .select("file status title pages")
      .lean();

    if (!note || note.status !== "approved" || !note.file) {
      return res.status(404).json({
        success: false,
        message: "Invalid or missing note",
      });
    }

    // ✅ Correct purchase check
    const isPurchased = await purchaseModel.exists({
      user: userId,
      note: id,
      status: "paid",
    });

    const fileUrl = await getS3SignedDownloadUrl(
      note.file,
      60 * 10,
      "application/pdf"
    );

    // HEAD optional
    try {
      await axios.head(fileUrl, { timeout: 10000 });
    } catch {
      console.warn("HEAD failed, continuing without size check");
    }

    const pdfResponse = await axios.get(fileUrl, {
      responseType: "arraybuffer",
      timeout: 30000,
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      validateStatus: (s) => s >= 200 && s < 300,
    });

    // 🔒 Headers that FORCE inline rendering (no download manager)
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'inline; filename="preview.pdf"');
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("X-Content-Type-Options", "nosniff");

    // If purchased → return full PDF
    if (isPurchased) {
      return res.status(200).send(Buffer.from(pdfResponse.data));
    }

    // Preview logic
    const originalPdf = await PDFDocument.load(pdfResponse.data);
    const totalPages = originalPdf.getPageCount();

    const previewPageCount = Math.min(10, Math.max(1, totalPages - 1));
    const previewPdf = await PDFDocument.create();

    const pages = await previewPdf.copyPages(
      originalPdf,
      Array.from({ length: previewPageCount }, (_, i) => i)
    );
    pages.forEach((page) => previewPdf.addPage(page));

    previewPdf.getPages().forEach((page) => {
      const { width, height } = page.getSize();
      page.drawText("Studenote • Preview Only", {
        x: width * 0.15,
        y: height * 0.45,
        size: 34,
        rotate: degrees(45),
        color: rgb(0.85, 0.85, 0.85),
        opacity: 0.35,
      });
    });

    const previewBytes = await previewPdf.save();

    return res.status(200).send(Buffer.from(previewBytes));
  } catch (error: any) {
    console.error("PDF PREVIEW ERROR:", {
      message: error?.message,
      status: error?.response?.status,
      data: error?.response?.data,
    });

    return res.status(500).json({
      success: false,
      message: "Preview failed",
    });
  }
};