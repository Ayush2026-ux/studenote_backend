import { Request, Response } from "express";
import mongoose from "mongoose";
import NotesUpload from "../../../models/users/NotesUpload";
import purchaseModel from "../../../models/payments/purchase.model";
import commentModels from "../../../models/users/comment.models";
import saveModels from "../../../models/users/save.module";
import shareModels from "../../../models/users/noteShare.model";
import feedlike from "../../../models/users/feedlike";
import Feed from "../../../models/users/feed.models";


interface AuthRequest extends Request {
    user?: { _id: string };
}
export const getMyNotesList = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?._id;

        if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(401).json({ success: false, message: "Unauthorized user" });
        }

        // Pagination
        const page = Math.max(1, Number(req.query.page || 1));
        const limit = Math.min(5, Number(req.query.limit || 5)); // max 5
        const skip = (page - 1) * limit;

        // Fetch notes
        const notes = await NotesUpload.find({ uploadedBy: userId })
            .select("_id title subject fileType file thumbnail createdAt  status") // select only needed fields
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        const total = await NotesUpload.countDocuments({ uploadedBy: userId });

        if (!notes.length) {
            return res.status(200).json({
                success: true,
                message: page === 1 ? "You have not uploaded any notes yet" : "No more notes",
                notes: [],
                page,
                limit,
                total,
                hasMore: false,
            });
        }

        const noteIds = notes.map(n => new mongoose.Types.ObjectId(n._id));

        // Fetch feeds for notes
        const feeds = await Feed.find({ note: { $in: noteIds } })
            .select("_id note")
            .lean();

        const noteToFeedMap = new Map<string, string>();
        const feedIds: mongoose.Types.ObjectId[] = [];

        feeds.forEach((f: any) => {
            noteToFeedMap.set(String(f.note), String(f._id));
            feedIds.push(new mongoose.Types.ObjectId(f._id));
        });

        // ✅ Purchases aggregation (earnings + downloads)
        const purchasesAgg = await purchaseModel.aggregate([
            { $match: { note: { $in: noteIds }, status: "paid" } },
            {
                $group: {
                    _id: "$note",
                    downloads: { $sum: 1 },
                    earnings: { $sum: { $subtract: ["$amount", "$platformFee"] } },
                },
            },
        ]);

        const purchasesMap = new Map(purchasesAgg.map(p => [String(p._id), p]));

        // ✅ Likes, Saves, Comments by FEED; Shares by NOTE
        const [likesAgg, savesAgg, commentsAgg, sharesAgg] = await Promise.all([
            feedlike.aggregate([
                { $match: { feed: { $in: feedIds } } },
                { $group: { _id: "$feed", count: { $sum: 1 } } },
            ]),
            saveModels.aggregate([
                { $match: { feed: { $in: feedIds } } },
                { $group: { _id: "$feed", count: { $sum: 1 } } },
            ]),
            commentModels.aggregate([
                { $match: { feed: { $in: feedIds }, isDeleted: false } },
                { $group: { _id: "$feed", count: { $sum: 1 } } },
            ]),
            shareModels.aggregate([
                { $match: { note: { $in: noteIds } } },
                { $group: { _id: "$note", count: { $sum: 1 } } },
            ]),
        ]);

        const likesMap = new Map(likesAgg.map(l => [String(l._id), l.count]));
        const savesMap = new Map(savesAgg.map(s => [String(s._id), s.count]));
        const commentsMap = new Map(commentsAgg.map(c => [String(c._id), c.count]));
        const sharesMap = new Map(sharesAgg.map(s => [String(s._id), s.count]));

        // ✅ Final response formatting
        const formatted = notes.map((note: any) => {
            const purchase = purchasesMap.get(String(note._id));
            const feedId = noteToFeedMap.get(String(note._id));

            return {
                id: note._id,
                title: note.title,
                subject: note.subject || "General",

                type: note.fileType || "Others",
                file: note.file,
                thumbnail: note.thumbnail,
                status: note.status,                 // approved | pending | rejected


                earnings: purchase?.earnings || 0,
                //downloads: purchase?.downloads || 0,

                likes: feedId ? likesMap.get(feedId) || 0 : 0,
                saves: feedId ? savesMap.get(feedId) || 0 : 0,
                comments: feedId ? commentsMap.get(feedId) || 0 : 0,
                shares: sharesMap.get(String(note._id)) || 0,

                uploadDate: note.createdAt
                    ? new Date(note.createdAt).toISOString().split("T")[0]
                    : null,
            };
        });

        return res.status(200).json({
            success: true,
            message: "My notes fetched successfully",
            notes: formatted,
            page,
            limit,
            total,
            hasMore: skip + formatted.length < total,
        });
    } catch (error) {
        console.error("GET_MY_NOTES_LIST_ERROR:", error);
        return res.status(500).json({ success: false, message: "Failed to fetch your notes" });
    }
};
