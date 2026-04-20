import { Request, Response } from "express";
import mongoose from "mongoose";
import Feed from "../../../models/users/feed.models";
import FeedView from "../../../models/users/feedView.models";
import FeedLike from "../../../models/users/feedlike";
import NotesUpload from "../../../models/users/NotesUpload";
import SavedFeed from "../../../models/users/save.module";
import Follow from "../../../models/users/follow.module";

import Purchase from "../../../models/payments/purchase.model";
import { createFeedSchema } from "../../../validators/feed.zod";
import { getS3SignedDownloadUrl } from "../../../services/users/uploadnots.services";

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

/* ======================================================
   GET HOME FEED (INFINITE SCROLL) – OPTIMIZED
====================================================== */

export const getFeeds = async (req: Request, res: Response) => {
    try {
        const limit = Math.min(Number(req.query.limit) || 10, 10);
        const userId = (req as any)?.user?.id;

        const seenIdsRaw = req.query.seenIds
            ? decodeURIComponent(req.query.seenIds as string)
                .split(",")
                .map((id) => id.trim())
                .filter((id) => mongoose.Types.ObjectId.isValid(id))
                .slice(-50)
            : [];

        const seenIds = Array.from(new Set(seenIdsRaw)).map(
            (id) => new mongoose.Types.ObjectId(id)
        );

        const query: any = { isActive: true, visibility: "public" };
        if (seenIds.length) query._id = { $nin: seenIds };

        const feeds = await Feed.find(query)
            .sort({ score: -1, createdAt: -1 })
            .limit(limit)
            .select("author note likes views commentsCount shareCount score createdAt")
            .populate("author", "fullName username avatar") // ✅ FIXED
            .populate("note", "title course description thumbnail price file")
            .lean();

        if (!feeds.length) {
            return res.json({ success: true, data: [] });
        }

        if (!userId) {
            return res.json({ success: true, data: feeds });
        }

        const feedIds = feeds.map((f) => f._id);
        const noteIds = feeds.map((f) => f.note?._id).filter(Boolean);
        const authorIds = feeds.map((f) => f.author?._id).filter(Boolean);

        const [likes, saves, purchases, follows] = await Promise.all([
            FeedLike.find({ user: userId, feed: { $in: feedIds } }).select("feed").lean(),
            SavedFeed.find({ user: userId, feed: { $in: feedIds } }).select("feed").lean(),
            Purchase.find({ user: userId, note: { $in: noteIds }, status: "paid" }).select("note").lean(),
            Follow.find({ follower: userId, following: { $in: authorIds } }).select("following").lean(),
        ]);

        const likedSet = new Set(likes.map((l: any) => String(l.feed)));
        const savedSet = new Set(saves.map((s: any) => String(s.feed)));
        const purchasedSet = new Set(purchases.map((p: any) => String(p.note)));
        const followingSet = new Set(follows.map((f: any) => String(f.following)));

        const finalFeeds = feeds.map((feed: any) => ({
            ...feed,

            /// 🔥 ORIGINAL KEYS
            likedByMe: likedSet.has(String(feed._id)),
            savedByMe: savedSet.has(String(feed._id)),
            isFollowingAuthor: followingSet.has(String(feed.author?._id)),

            /// 🔥 FRONTEND SAFE KEYS (IMPORTANT)
            isLiked: likedSet.has(String(feed._id)),
            isSaved: savedSet.has(String(feed._id)),
            isFollowing: followingSet.has(String(feed.author?._id)),

            /// 🔥 SELF CHECK
            currentUserId: userId,

            /// extra
            isPurchased: purchasedSet.has(String(feed.note?._id)),
        }));

        return res.json({
            success: true,
            data: finalFeeds,
        });

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
        if (error.code === 11000) return res.json({ success: true, liked: true });

        console.error("LIKE_FEED_ERROR:", error);
        return res.status(500).json({ success: false, message: "Unable to update like" });
    }
};

/* ======================================================
   BATCH REGISTER FEED VIEWS (USE THIS IN FRONTEND)
====================================================== */

export const registerFeedViews = async (req: Request, res: Response) => {
    const userId = (req as any)?.user?.id;
    const ip = req.ip;
    const { feedId } = req.params;
    let feedIds = req.body?.feedIds;

    // Handle both single feedId from URL param and batch from body
    if (feedId && !feedIds) {
        feedIds = [feedId];
    }

    if (!feedIds || !Array.isArray(feedIds) || feedIds.length === 0) {
        return res.status(400).json({ success: false, message: "feedIds required" });
    }

    try {
        const validFeedIds = feedIds
            .filter((id: any) => typeof id === "string" && mongoose.Types.ObjectId.isValid(id))
            .map((id: string) => new mongoose.Types.ObjectId(id));

        if (validFeedIds.length === 0) {
            return res.status(400).json({ success: false, message: "No valid feed IDs" });
        }

        // Use upsert to avoid duplicate key errors for repeat viewers
        const bulkOps = validFeedIds.map((id: mongoose.Types.ObjectId) => ({
            updateOne: {
                filter: {
                    feed: id,
                    ...(userId ? { user: userId } : { ip }),
                },
                update: {
                    $set: {
                        feed: id,
                        ...(userId ? { user: userId } : { ip }),
                    },
                    $inc: { viewCount: 1 },
                },
                upsert: true,
            },
        }));

        if (bulkOps.length > 0) {
            await FeedView.bulkWrite(bulkOps);
        }

        // Increment feed views for all feeds (even repeat views)
        await Feed.updateMany({ _id: { $in: validFeedIds } }, { $inc: { views: 1 } });

        validFeedIds.forEach((id: mongoose.Types.ObjectId) => queueFeedScoreUpdate(String(id)));

        return res.json({ success: true });
    } catch (error: any) {
        console.error("REGISTER_VIEW_ERROR:", error);
        return res.json({ success: true });
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
        const feed = await Feed.findById(feedId).select("note").session(session);

        if (!feed) {
            await session.abortTransaction();
            return res.status(404).json({ success: false, message: "Feed not found" });
        }

        await Feed.updateOne({ _id: feedId }, { $inc: { shareCount: 1 } }, { session });
        await NotesUpload.updateOne({ _id: feed.note }, { $inc: { shareCount: 1 } }, { session });

        queueFeedScoreUpdate(feedId);

        await session.commitTransaction();

        /// 🔥 THIS IS THE FIX
        return res.json({
            success: true,
            link: `https://studenote.co.in/feed/${feedId}`
        });

    } catch (error) {
        await session.abortTransaction();
        console.error("SHARE_FEED_ERROR:", error);
        return res.status(500).json({ success: false, message: "Unable to share feed" });
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
            const feed = await Feed.findById(feedId).select("likes commentsCount shareCount views");
            if (!feed) return;

            const score = feed.likes * 4 + feed.commentsCount * 3 + feed.shareCount * 5 + feed.views * 0.2;
            await Feed.updateOne({ _id: feedId }, { score });
        } catch (error) {
            console.error("FEED_SCORE_ERROR:", error);
        }
    });
};



export const getFeedsMetadataBatch = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?._id;   // ✅ single source of truth

        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const { feedIds = [], authorIds = [], noteIds = [] } = req.body;

        if (!Array.isArray(feedIds) || !Array.isArray(authorIds) || !Array.isArray(noteIds)) {
            return res.status(400).json({
                success: false,
                message: "feedIds, authorIds and noteIds must be arrays",
            });
        }

        // 🛑 Short-circuit if nothing to check (prevents spam DB hits)
        if (!feedIds.length && !authorIds.length && !noteIds.length) {
            return res.json({ success: true, data: [] });
        }

        const feedObjectIds = feedIds
            .filter((id: any) => mongoose.Types.ObjectId.isValid(id))
            .map((id: any) => new mongoose.Types.ObjectId(id));

        const authorObjectIds = authorIds
            .filter((id: any) => mongoose.Types.ObjectId.isValid(id))
            .map((id: any) => new mongoose.Types.ObjectId(id));

        const noteObjectIds = noteIds
            .filter((id: any) => mongoose.Types.ObjectId.isValid(id))
            .map((id: any) => new mongoose.Types.ObjectId(id));

        const [likes, saves, follows, reverseFollows, purchases] = await Promise.all([
            feedObjectIds.length
                ? FeedLike.find({ user: userId, feed: { $in: feedObjectIds } }).select("feed").lean()
                : Promise.resolve([]),

            feedObjectIds.length
                ? SavedFeed.find({ user: userId, feed: { $in: feedObjectIds } }).select("feed").lean()
                : Promise.resolve([]),

            authorObjectIds.length
                ? Follow.find({ follower: userId, following: { $in: authorObjectIds } })
                    .select("following")
                    .lean()
                : Promise.resolve([]),

            authorObjectIds.length
                ? Follow.find({ following: userId, follower: { $in: authorObjectIds } })
                    .select("follower")
                    .lean()
                : Promise.resolve([]),

            noteObjectIds.length
                ? Purchase.find({ user: userId, note: { $in: noteObjectIds }, status: "paid" })
                    .select("note")
                    .lean()
                : Promise.resolve([]),
        ]);

        const likedSet = new Set(likes.map((l: any) => String(l.feed)));
        const savedSet = new Set(saves.map((s: any) => String(s.feed)));
        const followingSet = new Set(follows.map((f: any) => String(f.following)));
        const reverseFollowingSet = new Set(reverseFollows.map((f: any) => String(f.follower)));
        const purchasedSet = new Set(purchases.map((p: any) => String(p.note)));

        const result = feedIds.map((feedId: string, idx: number) => {
            const authorId = authorIds[idx];
            const noteId = noteIds[idx];

            let followStatus: "follow" | "follow_back" | "following" | "self" = "follow";

            if (authorId && String(authorId) === String(userId)) {
                followStatus = "self";
            } else if (authorId && followingSet.has(String(authorId))) {
                followStatus = "following";
            } else if (authorId && reverseFollowingSet.has(String(authorId))) {
                followStatus = "follow_back";
            }

            return {
                feedId,
                likedByMe: likedSet.has(String(feedId)),
                savedByMe: savedSet.has(String(feedId)),
                followStatus,
                isPurchased: noteId ? purchasedSet.has(String(noteId)) : false,
            };
        });

        res.setHeader("Cache-Control", "private, no-store");
        return res.json({ success: true, data: result });
    } catch (error: any) {
        console.error("[Batch Metadata Error]:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Batch metadata failed",
        });
    }
};
