import { Request, Response } from "express";
import FeedLike from "../../../models/users/feedlike";

/* ======================================================
   CHECK IF USER LIKED FEED
====================================================== */

export const hasLikedFeed = async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    const { feedId } = req.params;

    const liked = await FeedLike.exists({
        feed: feedId,
        user: userId,
    });

    res.json({
        success: true,
        liked: Boolean(liked),
    });
};

/* ======================================================
   GET USER LIKED FEEDS (PAGINATED)
====================================================== */

export const getUserLikedFeeds = async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const likes = await FeedLike.find({ user: userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("feed")
        .lean();

    res.json({
        success: true,
        page,
        feeds: likes.map(l => l.feed),
    });
};
