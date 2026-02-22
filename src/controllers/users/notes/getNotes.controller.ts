import { Request, Response } from "express";
import NotesUpload from "../../../models/users/NotesUpload";
import { getS3SignedDownloadUrl } from "../../../services/users/uploadnots.services";

/**
 * Public / Explore notes listing (separate from Home feed)
 * Avoids name clash with Home controller getAllNotes
 */
export const getPublicNotes = async (req: Request, res: Response) => {
  try {
    const notes = await NotesUpload.find({ isActive: true })
      .sort({ createdAt: -1 })
      .lean();

    const notesWithUrls = await Promise.all(
      notes.map(async (note: any) => {
        let thumbnailUrl: string | null = null;
        let fileUrl: string | null = null;

        if (note.thumbnail) {
          thumbnailUrl = await getS3SignedDownloadUrl(
            note.thumbnail,
            60 * 60,
            "image/jpeg"
          );
        }

        if (note.file) {
          fileUrl = await getS3SignedDownloadUrl(
            note.file,
            60 * 10,
            "application/pdf"
          );
        }

        return {
          ...note,
          id: note._id.toString(), // frontend expects `id`
          thumbnailUrl,
          fileUrl,
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