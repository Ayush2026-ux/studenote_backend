// controllers/users/profile/profile.controller.ts
import { Request, Response } from "express";
import mongoose from "mongoose";

import NoteUploads from "../../../models/users/NotesUpload";
import followModule from "../../../models/users/follow.module";
import purchaseModel from "../../../models/payments/purchase.model";

/* ======================================================
   GET PROFILE STATS
   - Total Notes Uploaded
   - Followers / Following
   - Total Earnings (from paid purchases of user's notes)
====================================================== */

export const getProfileStats = async (req: Request, res: Response) => {
    try {
        // 🚫 Disable cache (fixes 304 + stale stats)
        res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
        res.setHeader("Pragma", "no-cache");
        res.setHeader("Expires", "0");

        const userId = (req as any).user?.id || (req as any).user?._id;

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid user",
            });
        }

        const userObjectId = new mongoose.Types.ObjectId(userId);

        /* ================= FOLLOWERS / FOLLOWING ================= */

        const [followers, following] = await Promise.all([
            followModule.countDocuments({ following: userObjectId }),
            followModule.countDocuments({ follower: userObjectId }),
        ]);

        /* ================= USER NOTES ================= */

        const noteIds = await NoteUploads.find(
            {
                uploadedBy: userObjectId,
                isDeleted: { $ne: true }, // safe even if field doesn't exist
            },
            { _id: 1 }
        ).lean().then(notes => notes.map(n => n._id));

        const notes = noteIds.length;

        /* ================= TOTAL EARNINGS ================= */

        let totalEarnings = 0;

        if (noteIds.length > 0) {
            const earningsAgg = await purchaseModel.aggregate([
                { $match: { note: { $in: noteIds }, status: "paid" } },
                {
                    $group: {
                        _id: null,
                        total: { $sum: { $subtract: ["$amount", "$platformFee"] } }, // net earnings
                    },
                },
            ]);

            totalEarnings = earningsAgg.length ? earningsAgg[0].total : 0;
        }

        /* ================= RESPONSE ================= */

        return res.status(200).json({
            success: true,
            data: {
                followers,
                following,
                notes,
                totalEarnings, // ✅ new field
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
