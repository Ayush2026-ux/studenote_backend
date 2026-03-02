import { Request, Response } from "express";
import NotesUpload from "../../models/users/NotesUpload";
import { getS3SignedDownloadUrl } from "../../services/users/uploadnots.services";

interface AuthRequest extends Request {
  user?: { _id: string };
}

export const previewNotePdf = async (req: AuthRequest, res: Response) => {
  try {
    const noteId = req.params.id;

    const note = await NotesUpload.findById(noteId).select("file").lean();

    if (!note?.file) {
      return res.status(404).json({
        success: false,
        message: "PDF not found",
      });
    }

    const signedUrl = await getS3SignedDownloadUrl(
      note.file,
      900,
      "application/pdf"
    );

    return res.status(200).json({
      success: true,
      url: signedUrl,
    });
  } catch (error) {
    console.error("Preview Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to generate preview",
    });
  }
};