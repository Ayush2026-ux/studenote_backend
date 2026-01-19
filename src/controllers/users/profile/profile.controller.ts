import { Request, Response } from "express";
import mongoose from "mongoose";

import User from "../../../models/users/users.models";
import NotesUpload from "../../../models/users/NotesUpload";
import feedModels from "../../../models/users/feed.models";
import followModule from "../../../models/users/follow.module";
import feedViewModels from "../../../models/users/feedView.models";

/* ======================================================
   GET PROFILE STATS
====================================================== */

export const getProfileStats = async (req: Request, res: Response) => {
    try {
        const userId =
            (req as any).user?.id ||
            (req as any).user?._id;

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid user",
            });
        }

        const userObjectId = new mongoose.Types.ObjectId(userId);

        /* ================= FOLLOWERS / FOLLOWING ================= */

        // 👥 Followers = jisne is user ko follow kiya
        const followersCount = await followModule.countDocuments({
            following: userObjectId,
        });

        // ➕ Following = user ne kitno ko follow kiya
        const followingCount = await followModule.countDocuments({
            follower: userObjectId,
        });

        /* ================= NOTES UPLOADED ================= */

        const notesCount = await NotesUpload.countDocuments({
            uploadedBy: userObjectId,
            isDeleted: false,
        });

        /* ================= USER FEEDS ================= */

        const userFeeds = await feedModels
            .find(
                {
                    author: userObjectId,
                    isDeleted: false,
                },
                { _id: 1 }
            )
            .lean();

        const feedIds = userFeeds.map((f) => f._id);

        /* ================= TOTAL VIEWS ================= */

        const totalViews = await feedViewModels.countDocuments({
            feed: { $in: feedIds },
        });

        /* ================= TOTAL LIKES ================= */

        const likesAgg = await feedModels.aggregate([
            {
                $match: {
                    author: userObjectId,
                    isDeleted: false,
                },
            },
            {
                $group: {
                    _id: null,
                    totalLikes: { $sum: "$likes" },
                },
            },
        ]);

        const totalLikes = likesAgg[0]?.totalLikes || 0;

        /* ================= RESPONSE ================= */

        return res.json({
            success: true,
            data: {
                followers: followersCount,
                following: followingCount,
                notes: notesCount,
                views: totalViews,
                likes: totalLikes,
            },
        });
    } catch (error) {
        console.error("PROFILE_STATS_ERROR:", error);
        return res.status(500).json({
            success: false,
            message: "Unable to fetch profile stats",
        });
    }
};
