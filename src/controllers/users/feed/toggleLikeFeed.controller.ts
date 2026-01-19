import { Request, Response } from "express";
import mongoose from "mongoose";

import Feed from "../../../models/users/feed.models";
import FeedLike from "../../../models/users/feedlike";
import Notification from "../../../models/users/notification.models";
import User from "../../../models/users/users.models";
import { sendPushNotification } from "../../../utils/sendPushNotification";

/* ======================================================
   TOGGLE LIKE FEED
====================================================== */

export const toggleLikeFeed = async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    const { feedId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(feedId)) {
        return res.status(400).json({
            success: false,
            message: "Invalid feed id",
        });
    }

    try {
        /* ================= FETCH FEED ================= */
        const feed = await Feed.findById(feedId).select("author").lean();

        if (!feed) {
            return res.status(404).json({
                success: false,
                message: "Feed not found",
            });
        }

        /* ================= TOGGLE LIKE ================= */
        const existingLike = await FeedLike.findOne({
            feed: feedId,
            user: userId,
        });

        // UNLIKE
        if (existingLike) {
            await FeedLike.deleteOne({ _id: existingLike._id });
            await Feed.updateOne(
                { _id: feedId },
                { $inc: { likes: -1 } }
            );

            return res.json({
                success: true,
                liked: false,
            });
        }

        // LIKE
        await FeedLike.create({
            feed: feedId,
            user: userId,
        });

        await Feed.updateOne(
            { _id: feedId },
            { $inc: { likes: 1 } }
        );

        /* ================= NOTIFICATION + PUSH ================= */

        // Prevent self-like notification
        if (feed.author.toString() !== userId.toString()) {

            // Save notification (deduped)
            await Notification.updateOne(
                {
                    recipient: feed.author,
                    sender: userId,
                    type: "LIKE",
                    feed: feedId,
                },
                {
                    $setOnInsert: {
                        recipient: feed.author,
                        sender: userId,
                        type: "LIKE",
                        feed: feedId,
                        isRead: false,
                    },
                },
                { upsert: true }
            );

            // Fetch sender name
            const senderUser = await User.findById(userId)
                .select("fullName username")
                .lean();

            // Fetch recipient push token
            const recipientUser = await User.findById(feed.author)
                .select("expoPushToken")
                .lean();

            const pushToken = recipientUser?.expoPushToken;

            if (pushToken) {
                await sendPushNotification({
                    expoPushToken: pushToken, // now string
                    title: "New like",
                    body: `${senderUser?.fullName || senderUser?.username || "Someone"} liked your post`,
                    data: {
                        type: "LIKE",
                        feedId,
                        senderId: userId,
                    },
                });
            }

        }

        res.json({
            success: true,
            liked: true,
        });
    } catch (error) {
        console.error("TOGGLE_LIKE_ERROR:", error);
        res.status(500).json({
            success: false,
            message: "Unable to toggle like",
        });
    }
};
