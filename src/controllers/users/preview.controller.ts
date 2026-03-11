import { Request, Response } from "express";
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

    const note = await NotesUpload.findById(noteId).select("file uploadedBy").lean();

    if (!note?.file) {
      return res.status(404).json({
        success: false,
        message: "PDF not found",
      });
    }

    let isBought = false;

    // Check if user is the author
    if (note.uploadedBy?.toString() === userId.toString()) {
      isBought = true;
    } else {
      // Check if user has purchased the note
      const purchase = await Purchase.findOne({
        user: userId,
        note: noteId,
        status: "paid"
      });

      if (purchase) {
        isBought = true;
      }
    }

    const signedUrl = await getS3SignedDownloadUrl(
      note.file,
      900,
      "application/pdf"
    );

    return res.status(200).json({
      success: true,
      url: signedUrl,
      isBought,
    });
  } catch (error) {
    console.error("Preview Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to generate preview",
    });
  }
};