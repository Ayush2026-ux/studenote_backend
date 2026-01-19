import { Request, Response } from "express";
import mongoose from "mongoose";

import Feed from "../../../models/users/feed.models";
import FeedView from "../../../models/users/feedView.models";
import FeedLike from "../../../models/users/feedlike";
import NotesUpload from "../../../models/users/NotesUpload";
import { createFeedSchema } from "../../../validators/feed.zod";

/* ======================================================
   CREATE FEED (OPTIONAL – MANUAL / ADMIN)
====================================================== */

export const createFeed = async (req: Request, res: Response) => {
    try {
        const parsed = createFeedSchema.safeParse(req.body);

        if (!parsed.success) {
            return res.status(400).json({
                success: false,
                message: parsed.error.issues[0].message,
            });
        }

        const { note } = parsed.data;

        const noteDoc = await NotesUpload.findOne({
            _id: note,
            status: "approved",
        }).lean();

        if (!noteDoc) {
            return res.status(400).json({
                success: false,
                message: "Note not approved or not found",
            });
        }

        const existing = await Feed.findOne({ note });
        if (existing) {
            return res.status(409).json({
                success: false,
                message: "Feed already exists",
            });
        }

        const feed = await Feed.create({
            note: noteDoc._id,
            author: noteDoc.uploadedBy,
            visibility: "public",
            isActive: true,
            likes: 0,
            views: 0,
            commentsCount: 0,
            shareCount: 0,
            score: 0,
        });

        return res.status(201).json({ success: true, data: feed });
    } catch (error) {
        console.error("CREATE_FEED_ERROR:", error);
        return res.status(500).json({
            success: false,
            message: "Unable to create feed",
        });
    }
};


let hasMigrated = false;

const syncApprovedNotesOnceInternal = async () => {
    if (hasMigrated) return;

    console.log("🔁 Running one-time approved notes migration...");

    const approvedNotes = await NotesUpload.find({ status: "approved" })
        .select("_id uploadedBy");

    for (const note of approvedNotes) {
        const exists = await Feed.findOne({ note: note._id });
        if (exists) continue;

        await Feed.create({
            note: note._id,
            author: note.uploadedBy,
            visibility: "public",
            isActive: true,
            likes: 0,
            views: 0,
            commentsCount: 0,
            shareCount: 0,
            score: 0,
        });
    }

    hasMigrated = true;
    console.log("✅ Approved notes migration completed");
};


/* ======================================================
   GET HOME FEED (INFINITE SCROLL)
====================================================== */

export const getFeeds = async (req: Request, res: Response) => {
    try {
        const limit = Math.min(Number(req.query.limit) || 10, 10);
        const userId = (req as any)?.user?.id;

        // ✅ SAFE seenIds
        const seenIds = (req.query.seenIds as string | undefined)
            ?.split(",")
            .map(id => id.trim())
            .filter(id => mongoose.Types.ObjectId.isValid(id))
            .slice(-50)
            .map(id => new mongoose.Types.ObjectId(id));

        const query: any = {
            isActive: true,
            visibility: "public",
        };

        if (seenIds?.length) {
            query._id = { $nin: seenIds };
        }

        // 1️⃣ Fetch feeds
        const feeds = await Feed.find(query)
            .sort({ score: -1, createdAt: -1 })
            .limit(limit)
            .select(
                "author note likes views commentsCount shareCount score createdAt"
            )
            .populate("author", "fullName avatar")
            // ✅ file field added here
            .populate("note", "title thumbnail price file")
            .lean();
       // console.log("Feeds fetched:", feeds);
        // 🟡 Not logged in
        if (!userId || feeds.length === 0) {
            res.setHeader("Cache-Control", "no-store");
            return res.json({ success: true, data: feeds });
        }

        // 2️⃣ Collect feed IDs
        const feedIds = feeds.map(f => f._id);

        // 3️⃣ Fetch likes & saves
        const likedFeeds = await FeedLike.find({
            user: userId,
            feed: { $in: feedIds },
        })
            .select("feed")
            .lean<{ feed: mongoose.Types.ObjectId }[]>();

        const savedFeeds = await mongoose
            .model("SavedFeed")
            .find({
                user: userId,
                feed: { $in: feedIds },
            })
            .select("feed")
            .lean<{ feed: mongoose.Types.ObjectId }[]>();

        const likedSet = new Set(likedFeeds.map(l => l.feed.toString()));
        const savedSet = new Set(savedFeeds.map(s => s.feed.toString()));

        // 4️⃣ Merge status into feed
        const finalFeeds = feeds.map(feed => ({
            ...feed,
            likedByMe: likedSet.has(feed._id.toString()),
            savedByMe: savedSet.has(feed._id.toString()),
        }));

        // 🚫 Disable cache
        res.setHeader("Cache-Control", "no-store");

        return res.json({ success: true, data: finalFeeds });
    } catch (error) {
        console.error("GET_FEEDS_ERROR:", error);
        return res.status(500).json({
            success: false,
            message: "Unable to fetch feeds",
        });
    }
};

/* ======================================================
   LIKE / UNLIKE FEED
====================================================== */

export const toggleLikeFeed = async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    const { feedId } = req.params;

    try {
        const existing = await FeedLike.findOne({ feed: feedId, user: userId });

        if (existing) {
            await FeedLike.deleteOne({ _id: existing._id });
            await Feed.updateOne({ _id: feedId }, { $inc: { likes: -1 } });
            queueFeedScoreUpdate(feedId);
            return res.json({ success: true, liked: false });
        }

        await FeedLike.create({ feed: feedId, user: userId });
        await Feed.updateOne({ _id: feedId }, { $inc: { likes: 1 } });
        queueFeedScoreUpdate(feedId);

        return res.json({ success: true, liked: true });
    } catch (error: any) {
        if (error.code === 11000) {
            return res.json({ success: true, liked: true });
        }

        console.error("LIKE_FEED_ERROR:", error);
        return res.status(500).json({
            success: false,
            message: "Unable to update like",
        });
    }
};

/* ======================================================
   REGISTER FEED VIEW
====================================================== */

export const registerFeedView = async (req: Request, res: Response) => {
    const { feedId } = req.params;
    const userId = (req as any)?.user?.id;
    const ip = req.ip;

    try {
        await FeedView.create({
            feed: feedId,
            user: userId || undefined,
            ip: userId ? undefined : ip,
        });

        await Feed.updateOne({ _id: feedId }, { $inc: { views: 1 } });
        queueFeedScoreUpdate(feedId);

        return res.json({ success: true });
    } catch (error: any) {
        if (error.code === 11000) {
            return res.json({ success: true });
        }

        console.error("VIEW_FEED_ERROR:", error);
        return res.status(500).json({
            success: false,
            message: "Unable to register view",
        });
    }
};

/* ======================================================
   SHARE FEED
====================================================== */

export const shareFeed = async (req: Request, res: Response) => {
    const { feedId } = req.params;
    const session = await mongoose.startSession();

    session.startTransaction();
    try {
        const feed = await Feed.findById(feedId)
            .select("note")
            .session(session);

        if (!feed) {
            await session.abortTransaction();
            return res.status(404).json({
                success: false,
                message: "Feed not found",
            });
        }

        await Feed.updateOne(
            { _id: feedId },
            { $inc: { shareCount: 1 } },
            { session }
        );

        await NotesUpload.updateOne(
            { _id: feed.note },
            { $inc: { shareCount: 1 } },
            { session }
        );

        queueFeedScoreUpdate(feedId);

        await session.commitTransaction();
        return res.json({ success: true });
    } catch (error) {
        await session.abortTransaction();
        console.error("SHARE_FEED_ERROR:", error);
        return res.status(500).json({
            success: false,
            message: "Unable to share feed",
        });
    } finally {
        session.endSession();
    }
};



/* ======================================================
   FEED SCORE UPDATE (ASYNC)
====================================================== */

const queueFeedScoreUpdate = (feedId: string) => {
    setImmediate(async () => {
        try {
            const feed = await Feed.findById(feedId).select(
                "likes commentsCount shareCount views"
            );
            if (!feed) return;

            const score =
                feed.likes * 4 +
                feed.commentsCount * 3 +
                feed.shareCount * 5 +
                feed.views * 0.2;

            await Feed.updateOne({ _id: feedId }, { score });
        } catch (error) {
            console.error("FEED_SCORE_ERROR:", error);
        }
    });
};
