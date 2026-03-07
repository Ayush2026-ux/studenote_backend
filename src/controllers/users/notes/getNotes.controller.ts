import { Request, Response } from "express";
import NotesUpload from "../../../models/users/NotesUpload";
import purchaseModel from "../../../models/payments/purchase.model";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
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

    /* ---------- Auth check ---------- */

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    /* ---------- Purchase check ---------- */

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

    /* ---------- Find file ---------- */

    const note = await NotesUpload.findById(noteId)
      .select("file")
      .lean();

    if (!note?.file) {
      return res.status(404).json({
        message: "PDF not found",
      });
    }

    /* ---------- Generate Signed URL ---------- */

    const command = new GetObjectCommand({
      Bucket: S3_BUCKET_NAME,
      Key: note.file,
      ResponseContentDisposition: "inline",
      ResponseContentType: "application/pdf",
    });

    const signedUrl = await getSignedUrl(s3, command, {
      expiresIn: 60, // seconds
    });

    /* ---------- Send URL ---------- */

    return res.json({
      url: signedUrl,
    });

  } catch (err) {
    console.error("PREVIEW ERROR:", err);

    res.status(500).json({
      message: "Preview failed",
    });
  }
};