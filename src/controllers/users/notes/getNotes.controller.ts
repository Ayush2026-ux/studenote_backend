import { Request, Response } from "express";
import NotesUpload from "../../../models/users/NotesUpload";
import purchaseModel from "../../../models/payments/purchase.model";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { s3, S3_BUCKET_NAME } from "../../../config/s3";

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

    /* ---------- 1️⃣ Auth check ---------- */

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    /* ---------- 2️⃣ Purchase check ---------- */

    const hasPurchased = await purchaseModel.exists({
      user: userId,
      note: noteId,
      status: "paid",
    });

    if (!hasPurchased) {
      return res.status(403).json({
        message: "You have not purchased this note",
      });
    }

    /* ---------- 3️⃣ Find file ---------- */

    const note = await NotesUpload.findById(noteId)
      .select("file")
      .lean();

    if (!note?.file) {
      return res.status(404).json({
        message: "PDF not found",
      });
    }

    /* ---------- 4️⃣ Get file from S3 ---------- */

    const command = new GetObjectCommand({
      Bucket: S3_BUCKET_NAME,
      Key: note.file,
    });

    const data = await s3.send(command);

    if (!data.Body) {
      return res.status(500).json({
        message: "File stream missing",
      });
    }

    /* ---------- 5️⃣ Important headers ---------- */

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "inline");
    res.setHeader("Cache-Control", "no-store");

    // ⭐ REQUIRED FOR LARGE PDF STREAMING
    res.setHeader("Accept-Ranges", "bytes");

    if (data.ContentLength) {
      res.setHeader("Content-Length", data.ContentLength.toString());
    }

    /* ---------- 6️⃣ Stream PDF ---------- */

    const stream = data.Body as any;

    stream.on("error", (err: any) => {
      console.error("STREAM ERROR:", err);
      res.end();
    });

    stream.pipe(res);

  } catch (err) {
    console.error("PREVIEW ERROR:", err);

    res.status(500).json({
      message: "Preview failed",
    });
  }
};