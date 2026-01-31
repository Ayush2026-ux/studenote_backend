//controllers\users\profile\profile.controller.ts
import { Request, Response } from "express";
import mongoose from "mongoose";

import NoteUploads from "../../../models/users/NotesUpload";
import Feed from "../../../models/users/feed.models";
import FeedView from "../../../models/users/feedView.models";
import followModule from "../../../models/users/follow.module";

/* ======================================================
   GET PROFILE STATS
   - Total Notes Uploaded
   - Total Views (from FeedView, linked via Feed → Note)
   - Followers / Following
====================================================== */

export const getProfileStats = async (req: Request, res: Response) => {
    try {
        //  Disable cache (fixes 304 + stale stats)
        res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
        res.setHeader("Pragma", "no-cache");
        res.setHeader("Expires", "0");

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

        const followers = await followModule.countDocuments({
            following: userObjectId,
        });

        const following = await followModule.countDocuments({
            follower: userObjectId,
        });

        /* ================= USER NOTES ================= */

        const userNotes = await NoteUploads.find(
            {
                uploadedBy: userObjectId,
                isDeleted: { $ne: true }, // safe even if field doesn't exist
            },
            { _id: 1 }
        ).lean();

        const noteIds = userNotes.map((n) => n._id);
        const notes = noteIds.length;

        /* ================= FEEDS FOR THOSE NOTES ================= */

        let views = 0;

        if (noteIds.length > 0) {
            const feeds = await Feed.find(
                {
                    note: { $in: noteIds },
                    isActive: true,
                },
                { _id: 1 }
            ).lean();

            const feedIds = feeds.map((f) => f._id);

            /* ================= REAL VIEWS (FeedView) ================= */

            if (feedIds.length > 0) {
                views = await FeedView.countDocuments({
                    feed: { $in: feedIds },
                });
            }
        }

        /* ================= RESPONSE ================= */
        return res.status(200).json({
            success: true,
            data: {
                followers,
                following,
                notes,
                views,
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
