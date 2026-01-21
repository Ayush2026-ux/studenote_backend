import { Request, Response } from "express";
import Feed from "../../../models/users/feed.models";

/* ======================================================
   GET FEED VIEW COUNT
====================================================== */

export const getFeedViews = async (req: Request, res: Response) => {
    const { feedId } = req.params;

    const feed = await Feed.findById(feedId).select("views");

    if (!feed) {
        return res.status(404).json({
            success: false,
            message: "Feed not found",
        });
    }

    res.json({
        success: true,
        views: feed.views,
    });
};
