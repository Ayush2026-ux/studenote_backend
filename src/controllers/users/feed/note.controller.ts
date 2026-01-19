import { Request, Response } from "express";
import mongoose from "mongoose";

import NotesUpload from "../../../models/users/NotesUpload";
import NoteShare from "../../../models/users/noteShare.model";
import Feed from "../../../models/users/feed.models";

/* ======================================================
   SHARE NOTE (SYNC NOTE + FEED SHARE COUNT)
====================================================== */

export const shareNote = async (req: Request, res: Response) => {
    try {
        const userId =
            (req as any).user?.id ||
            (req as any).user?._id;

        const { noteId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(noteId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid note id",
            });
        }

        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            await NoteShare.create(
                [{ note: noteId, sharedBy: userId }],
                { session }
            );

            await NotesUpload.updateOne(
                { _id: noteId, isDeleted: false },
                { $inc: { shareCount: 1 } },
                { session }
            );

            await Feed.updateOne(
                { note: noteId },
                { $inc: { shareCount: 1 } },
                { session }
            );

            await session.commitTransaction();

            return res.json({
                success: true,
                message: "Note shared successfully",
            });
        } catch (err) {
            await session.abortTransaction();
            throw err;
        } finally {
            session.endSession();
        }
    } catch (error) {
        console.error("SHARE_NOTE_ERROR:", error);
        return res.status(500).json({
            success: false,
            message: "Unable to share note",
        });
    }
};
