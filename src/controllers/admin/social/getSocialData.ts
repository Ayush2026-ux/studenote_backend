import { Request, Response } from "express";
import Feed from "../../../models/users/feed.models";
import NotesUpload from "../../../models/users/NotesUpload";
/**
 * Get all social feed posts with moderation details
 * Fetches feed data and transforms it to match frontend requirements
 * @route GET /api/admin/social/posts
 * @query status - Filter by status (all, active, flagged, reported)
 * @query limit - Number of posts per page (default 10)
 * @query page - Page number (default 1)
 */
export const getSocialData = async (req: Request, res: Response) => {
    try {
        const { status = "all", limit = 10, page = 1 } = req.query;
        const skip = (Number(page) - 1) * Number(limit);

        // Build filter based on status
        let filter: any = {};

        if (status !== "all") {
            if (status === "active") {
                filter.isActive = true;
                filter.visibility = "public";
            } else if (status === "flagged") {
                filter.isActive = true;
                filter.visibility = "flagged";
            } else if (status === "reported") {
                filter.reportCount = { $gt: 0 };
            }
        }

        // Get total count
        const total = await Feed.countDocuments(filter);

        // Get paginated feed data with populated fields
        const feeds = await Feed.find(filter)
            .populate({
                path: "author",
                select: "fullName username email",
            })
            .populate({
                path: "note",
                select: "title file thumbnail description course subject semester fileType price university pages status views downloads createdAt uploadedBy",
            })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit))
            .lean();

        // Transform data to match frontend structure
        const posts = feeds.map((feed: any) => {
            const noteData = (feed as any).note as any;
            return {
                id: feed._id.toString(),
                title: noteData?.title || "Untitled",
                user: feed.author?.fullName || "Unknown User",
                file: noteData?.file ? noteData.file : null,
                thumbnail: noteData?.thumbnail || null,
                date: new Date(feed.createdAt).toISOString().split("T")[0], // Format: YYYY-MM-DD
                uploadDate: noteData?.createdAt ? new Date(noteData.createdAt).toISOString().split("T")[0] : null,
                reactions: feed.likes || 0,
                comments: feed.commentsCount || 0,
                views: feed.views || 0,
                downloads: noteData?.downloads || 0,
                shareCount: feed.shareCount || 0,
                status: getPostStatus(feed),
                fileType: noteData?.fileType || null,
                course: noteData?.course || null,
                subject: noteData?.subject || null,
                semester: noteData?.semester || null,
                price: noteData?.price || 0,
                pages: noteData?.pages || null,
                university: noteData?.university || null,
                noteStatus: noteData?.status || "pending",
                description: noteData?.description || null,
            };
        });
        console.log(posts);


        res.status(200).json({
            success: true,
            data: posts,
            pagination: {
                total,
                page: Number(page),
                limit: Number(limit),
                pages: Math.ceil(total / Number(limit)),
            },
        });
    } catch (error) {
        console.error("Error fetching social data:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch social feed data",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
};

/**
 * Get single post details with full context
 * @route GET /api/admin/social/posts/:postId
 */
export const getSinglePost = async (req: Request, res: Response) => {
    try {
        const { postId } = req.params;

        const feed = await Feed.findById(postId)
            .populate({
                path: "author",
                select: "fullName username email mobile",
            })
            .populate({
                path: "note",
                select: "title file thumbnail description course subject semester fileType price university pages status views downloads createdAt uploadedBy reviewMessage",
            })
            .lean();

        if (!feed) {
            return res.status(404).json({
                success: false,
                message: "Post not found",
            });
        }

        // Transform to frontend format
        const noteData = (feed as any).note as any;
        const post = {
            id: feed._id.toString(),
            title: noteData?.title || "Untitled",
            user: (feed.author as any)?.fullName || "Unknown User",
            file: noteData?.file ? noteData.file : null,
            thumbnail: noteData?.thumbnail || null,
            date: new Date(feed.createdAt).toISOString().split("T")[0],
            uploadDate: noteData?.createdAt ? new Date(noteData.createdAt).toISOString().split("T")[0] : null,
            reactions: feed.likes || 0,
            comments: feed.commentsCount || 0,
            status: getPostStatus(feed),
            views: feed.views || 0,
            downloads: noteData?.downloads || 0,
            shareCount: feed.shareCount || 0,
            visibility: feed.visibility,
            score: feed.score || 0,
            isActive: feed.isActive,
            createdAt: feed.createdAt,
            updatedAt: feed.updatedAt,
            fileType: noteData?.fileType || null,

            price: noteData?.price || 0,
            pages: noteData?.pages || null,
            description: noteData?.description || null,
            reviewMessage: noteData?.reviewMessage || null,
            author: feed.author,
            note: noteData,
        };
        //  console.log("Fetched single post details:", post);

        res.status(200).json({
            success: true,
            data: post,
        });
    } catch (error) {
        console.error("Error fetching post details:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch post details",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
};

/**
 * Helper function to determine post status based on feed properties
 * Status can be: active, flagged, or reported
 */
function getPostStatus(feed: any): "active" | "flagged" | "reported" {
    // If post has many reports, mark as reported
    if (feed.reportCount && feed.reportCount > 5) {
        return "reported";
    }

    // If post visibility is flagged
    if (feed.visibility === "flagged") {
        return "flagged";
    }

    // If post is not active
    if (!feed.isActive) {
        return "reported";
    }

    // Otherwise it's active
    return "active";
}
