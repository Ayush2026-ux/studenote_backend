import { Request, Response } from "express";
import mongoose from "mongoose";
import { saveFeedSchema } from "../../../validators/save.zod";
import SavedFeed from "../../../models/users/save.module";
import Feed from "../../../models/users/feed.models";
import Notification from "../../../models/users/notification.models";

/* ======================================================
   SAVE FEED (IDEMPOTENT & SCALE SAFE)
====================================================== */

export const saveFeed = async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    const feedId = req.params.feedId;

    const parsed = saveFeedSchema.safeParse({
        user: userId,
        feed: feedId,
    });

    if (!parsed.success) {
        return res.status(400).json({
            success: false,
            message: parsed.error.issues[0].message,
        });
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const feed = await Feed.findById(feedId).select("author");
        if (!feed) {
            await session.abortTransaction();
            return res.status(404).json({
                success: false,
                message: "Feed not found",
            });
        }

        // Idempotent save
        const alreadySaved = await SavedFeed.exists(parsed.data);
        if (alreadySaved) {
            await session.abortTransaction();
            return res.json({
                success: true,
                saved: true,
            });
        }

        await SavedFeed.create([parsed.data], { session });

        // Notify feed owner (no self notify)
        if (feed.author.toString() !== userId) {
            await Notification.updateOne(
                {
                    recipient: feed.author,
                    sender: userId,
                    type: "SAVE",
                    feed: feedId,
                },
                {
                    $setOnInsert: {
                        recipient: feed.author,
                        sender: userId,
                        type: "SAVE",
                        feed: feedId,
                        isRead: false,
                    },
                },
                { upsert: true, session }
            );
        }

        await session.commitTransaction();

        res.status(201).json({
            success: true,
            saved: true,
        });
    } catch (error: any) {
        await session.abortTransaction();

        // Duplicate protection
        if (error.code === 11000) {
            return res.json({ success: true, saved: true });
        }

        console.error("SAVE_FEED_ERROR:", error);
        res.status(500).json({
            success: false,
            message: "Unable to save feed",
        });
    } finally {
        session.endSession();
    }
};

/* ======================================================
   UNSAVE FEED (IDEMPOTENT)
====================================================== */

export const unsaveFeed = async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    const feedId = req.params.feedId;

    try {
        await SavedFeed.deleteOne({
            user: userId,
            feed: feedId,
        });

        // No counter update needed (read from SavedFeed)
        res.json({
            success: true,
            saved: false,
        });
    } catch (error) {
        console.error("UNSAVE_FEED_ERROR:", error);
        res.status(500).json({
            success: false,
            message: "Unable to unsave feed",
        });
    }
};

/* ======================================================
   CHECK IF FEED IS SAVED
====================================================== */

export const hasSavedFeed = async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    const feedId = req.params.feedId;

    try {
        const exists = await SavedFeed.exists({
            user: userId,
            feed: feedId,
        });

        res.json({
            success: true,
            saved: !!exists,
        });
    } catch (error) {
        console.error("HAS_SAVED_FEED_ERROR:", error);
        res.status(500).json({
            success: false,
            message: "Unable to check save status",
        });
    }
};
