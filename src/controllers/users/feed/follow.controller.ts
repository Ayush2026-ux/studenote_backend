import { Request, Response } from "express";
import mongoose from "mongoose";
import Follow from "../../../models/users/follow.module";
import Notification from "../../../models/users/notification.models";
import { followUserSchema } from "../../../validators/follow.zod";
import User from "../../../models/users/users.models";

/* ======================================================
   FOLLOW USER (SCALE SAFE)
====================================================== */

export const followUser = async (req: Request, res: Response) => {
    const followerId = (req as any).user.id;
    const followingId = req.params.userId;

    // Prevent self-follow
    if (followerId === followingId) {
        return res.status(400).json({
            success: false,
            message: "You cannot follow yourself",
        });
    }

    const parsed = followUserSchema.safeParse({
        follower: followerId,
        following: followingId,
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
        // Idempotency check
        const alreadyFollowing = await Follow.exists(
            parsed.data
        );

        if (alreadyFollowing) {
            await session.abortTransaction();
            return res.json({ success: true, following: true });
        }

        await Follow.create([parsed.data], { session });

        // Update counters (CRITICAL for scale)
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

        // Notification (async-safe)
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

        res.status(201).json({
            success: true,
            following: true,
        });
    } catch (error) {
        await session.abortTransaction();
        console.error("FOLLOW_USER_ERROR:", error);

        res.status(500).json({
            success: false,
            message: "Unable to follow user",
        });
    } finally {
        session.endSession();
    }
};

/* ======================================================
   UNFOLLOW USER (SCALE SAFE)
====================================================== */

export const unfollowUser = async (req: Request, res: Response) => {
    const followerId = (req as any).user.id;
    const followingId = req.params.userId;

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const deleted = await Follow.findOneAndDelete(
            {
                follower: followerId,
                following: followingId,
            },
            { session }
        );

        // Idempotent unfollow
        if (!deleted) {
            await session.abortTransaction();
            return res.json({ success: true, following: false });
        }

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

        res.json({
            success: true,
            following: false,
        });
    } catch (error) {
        await session.abortTransaction();
        console.error("UNFOLLOW_USER_ERROR:", error);

        res.status(500).json({
            success: false,
            message: "Unable to unfollow user",
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

        res.json({
            success: true,
            following: !!exists,
        });
    } catch (error) {
        console.error("IS_FOLLOWING_ERROR:", error);
        res.status(500).json({
            success: false,
            message: "Unable to check follow status",
        });
    }
};



export const getFollowStatus = async (req: Request, res: Response) => {
    const currentUserId = (req as any).user.id;
    const targetUserId = req.params.userId;

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

        res.json({
            success: true,
            following: !!isFollowing,
            followedBy: !!isFollowedBy,
            status,
        });
    } catch (error) {
        console.error("FOLLOW_STATUS_ERROR:", error);
        res.status(500).json({
            success: false,
            message: "Unable to get follow status",
        });
    }
};
