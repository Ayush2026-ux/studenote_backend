//controllers\users\profile\getsavefeeddata.ts
import { Request, Response } from "express";
import mongoose from "mongoose";
import saveModule from "../../../models/users/save.module";


/* ======================================================
   GET SAVED FEEDS DATA (PROFILE → SAVED TAB)
====================================================== */

export const getSaveFeedData = async (req: Request, res: Response) => {
    try {
        // Disable cache (fixes 304 + stale UI)
        res.setHeader(
            "Cache-Control",
            "no-store, no-cache, must-revalidate, private"
        );
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

        /* ================= PAGINATION ================= */

        const page = Math.max(Number(req.query.page) || 1, 1);
        const limit = Math.min(Number(req.query.limit) || 10, 20);
        const skip = (page - 1) * limit;

        /* ================= FETCH SAVED FEEDS ================= */

        const savedFeeds = await saveModule.find({ user: userObjectId })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate({
                path: "feed",
                match: { isActive: true },
                select:
                    "author note likes views commentsCount shareCount score createdAt",
                populate: [
                    {
                        path: "author",
                        select: "fullName username avatar",
                    },
                    {
                        path: "note",
                        select:
                            "title course subject semester price thumbnail file views downloads",
                    },
                ],
            })
            .lean();

        /* ================= CLEAN NULL FEEDS ================= */

        const feeds = savedFeeds
            .filter((sf: any) => sf.feed) // feed deleted / inactive
            .map((sf: any) => sf.feed);

        /* ================= TOTAL COUNT ================= */

        const total = await saveModule.countDocuments({
            user: userObjectId,
        });

        /* ================= RESPONSE ================= */

        return res.status(200).json({
            success: true,
            data: feeds,
            meta: {
                page,
                limit,
                total,
                hasMore: page * limit < total,
            },
        });
    } catch (error) {
        console.error("GET_SAVED_FEEDS_ERROR:", error);
        return res.status(500).json({
            success: false,
            message: "Unable to fetch saved feeds",
        });
    }
};
};
