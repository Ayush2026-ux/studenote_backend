import { Request, Response } from "express";
import mongoose from "mongoose";
import Follow from "../../../models/users/follow.module";
import Notification from "../../../models/users/notification.models";
import User from "../../../models/users/users.models";

/* ======================================================
   🔥 TOGGLE FOLLOW (FOLLOW + UNFOLLOW IN ONE)
====================================================== */

export const toggleFollowUser = async (req: Request, res: Response) => {
    const followerId = (req as any).user.id;
    const followingId = req.params.userId;

    // ❌ prevent self follow
    if (followerId === followingId) {
        return res.status(400).json({
            success: false,
            message: "You cannot follow yourself",
        });
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const existing = await Follow.findOne({
            follower: followerId,
            following: followingId,
        }).session(session);

        /* ================= UNFOLLOW ================= */
        if (existing) {
            await Follow.deleteOne({ _id: existing._id }, { session });

            await User.updateOne(
                { _id: followerId },
                { $inc: { followingCount: -1 } },
                { session }
            );

            await User.updateOne(
                { _id: followingId },
                { $inc: { followersCount: -1 } },
                { session }
            );

            await session.commitTransaction();

            return res.json({
                success: true,
                following: false,
            });
        }

        /* ================= FOLLOW ================= */
        await Follow.create(
            [
                {
                    follower: followerId,
                    following: followingId,
                },
            ],
            { session }
        );

        await User.updateOne(
            { _id: followerId },
            { $inc: { followingCount: 1 } },
            { session }
        );

        await User.updateOne(
            { _id: followingId },
            { $inc: { followersCount: 1 } },
            { session }
        );

        // 🔔 Notification (no duplicate)
        await Notification.updateOne(
            {
                recipient: followingId,
                sender: followerId,
                type: "FOLLOW",
            },
            {
                $setOnInsert: {
                    recipient: followingId,
                    sender: followerId,
                    type: "FOLLOW",
                    isRead: false,
                },
            },
            { upsert: true, session }
        );

        await session.commitTransaction();

        return res.json({
            success: true,
            following: true,
        });

    } catch (error) {
        await session.abortTransaction();
        console.error("TOGGLE_FOLLOW_ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to toggle follow",
        });
    } finally {
        session.endSession();
    }
};

/* ======================================================
   CHECK IF USER IS FOLLOWING
====================================================== */

export const isFollowingUser = async (req: Request, res: Response) => {
    const followerId = (req as any).user.id;
    const followingId = req.params.userId;

    try {
        const exists = await Follow.exists({
            follower: followerId,
            following: followingId,
        });

        return res.json({
            success: true,
            following: !!exists,
        });
    } catch (error) {
        console.error("IS_FOLLOWING_ERROR:", error);
        return res.status(500).json({
            success: false,
            message: "Unable to check follow status",
        });
    }
};

/* ======================================================
   FOLLOW STATUS (SMART STATUS)
====================================================== */

export const getFollowStatus = async (req: Request, res: Response) => {
    const currentUserId = (req as any).user.id;
    const targetUserId = req.params.userId;

    // self check
    if (currentUserId === targetUserId) {
        return res.json({
            success: true,
            status: "self",
        });
    }

    try {
        const [isFollowing, isFollowedBy] = await Promise.all([
            Follow.exists({
                follower: currentUserId,
                following: targetUserId,
            }),
            Follow.exists({
                follower: targetUserId,
                following: currentUserId,
            }),
        ]);

        let status: "follow" | "follow_back" | "following";

        if (isFollowing) {
            status = "following";
        } else if (isFollowedBy) {
            status = "follow_back";
        } else {
            status = "follow";
        }

        return res.json({
            success: true,
            following: !!isFollowing,
            followedBy: !!isFollowedBy,
            status,
        });

    } catch (error) {
        console.error("FOLLOW_STATUS_ERROR:", error);
        return res.status(500).json({
            success: false,
            message: "Unable to get follow status",
        });
    }
};