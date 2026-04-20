import { Request, Response } from "express";
import mongoose from "mongoose";
import { createCommentSchema } from "../../../validators/comment.zod";
import Feed from "../../../models/users/feed.models";
import Comment from "../../../models/users/comment.models";

/* ======================================================
   ADD COMMENT (TOP LEVEL + REPLIES)
====================================================== */

export const addComment = async (req: Request, res: Response) => {
    const userId =
        (req as any).user?.id ||
        (req as any).user?._id;

    const parsed = createCommentSchema.safeParse({
        feed: req.body.feed,
        note: req.body.note,
        content: req.body.content,
        ...(req.body.parentComment
            ? { parentComment: req.body.parentComment }
            : {}),
        author: userId,
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
        /* ---------- CHECK FEED ---------- */
        const feedExists = await Feed.exists({
            _id: parsed.data.feed,
        });

        if (!feedExists) {
            await session.abortTransaction();
            return res.status(404).json({
                success: false,
                message: "Feed not found",
            });
        }

        /* ---------- ROOT COMMENT LOGIC ---------- */
        let rootComment: mongoose.Types.ObjectId | null = null;

        if (parsed.data.parentComment) {
            const parent = await Comment.findById(
                parsed.data.parentComment
            ).session(session);

            if (!parent || parent.isDeleted) {
                await session.abortTransaction();
                return res.status(404).json({
                    success: false,
                    message: "Parent comment not found",
                });
            }

            // If replying to a reply, keep same root
            rootComment = parent.rootComment || parent._id;
        }

        /* ---------- CREATE COMMENT ---------- */
        const [comment] = await Comment.create(
            [
                {
                    ...parsed.data,
                    rootComment,
                    isDeleted: false,
                },
            ],
            { session }
        );

        /* ---------- UPDATE COUNT ---------- */
        await Feed.updateOne(
            { _id: parsed.data.feed },
            { $inc: { commentsCount: 1 } },
            { session }
        );

        await session.commitTransaction();

        return res.status(201).json({
            success: true,
            comment,
        });
    } catch (error) {
        await session.abortTransaction();
        console.error("ADD_COMMENT_ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to add comment",
        });
    } finally {
        session.endSession();
    }
};

/* ======================================================
   DELETE COMMENT (CASCADE SOFT DELETE)
====================================================== */

/* ======================================================
   DELETE COMMENT (COMMENT AUTHOR OR POST AUTHOR)
====================================================== */

export const deleteComment = async (req: Request, res: Response) => {
    const userId =
        (req as any).user?.id ||
        (req as any).user?._id;

    const { commentId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(commentId)) {
        return res.status(400).json({
            success: false,
            message: "Invalid comment id",
        });
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        /* ---------- FIND COMMENT ---------- */
        const comment = await Comment.findOne({
            _id: commentId,
            isDeleted: false,
        }).session(session);

        if (!comment) {
            await session.abortTransaction();
            return res.status(404).json({
                success: false,
                message: "Comment not found or already deleted",
            });
        }

        /* ---------- FIND FEED ---------- */
        const feed = await Feed.findById(comment.feed)
            .select("author")
            .session(session);

        if (!feed) {
            await session.abortTransaction();
            return res.status(404).json({
                success: false,
                message: "Feed not found",
            });
        }

        /* ---------- AUTHORIZATION (ONLY POST OWNER) ---------- */
        const isPostOwner =
            feed.author.toString() === userId.toString();

        if (!isPostOwner) {
            await session.abortTransaction();
            return res.status(403).json({
                success: false,
                message: "Only post owner can delete comments",
            });
        }

        /* ---------- SOFT DELETE COMMENT ---------- */
        await Comment.updateOne(
            { _id: comment._id },
            { $set: { isDeleted: true } },
            { session }
        );

        /* ---------- SOFT DELETE ALL REPLIES ---------- */
        const repliesResult = await Comment.updateMany(
            {
                $or: [
                    { parentComment: comment._id },
                    { rootComment: comment._id },
                ],
                isDeleted: false,
            },
            { $set: { isDeleted: true } },
            { session }
        );

        /* ---------- UPDATE FEED COUNT ---------- */
        const totalDeleted =
            1 + (repliesResult.modifiedCount || 0);

        await Feed.updateOne(
            { _id: comment.feed },
            { $inc: { commentsCount: -totalDeleted } },
            { session }
        );

        await session.commitTransaction();

        return res.json({
            success: true,
            message: "Comment deleted by post owner",
            deletedCount: totalDeleted,
        });
    } catch (error) {
        await session.abortTransaction();
        console.error("DELETE_COMMENT_ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to delete comment",
        });
    } finally {
        session.endSession();
    }
};

/* ======================================================
   GET COMMENTS BY FEED
====================================================== */

export const getCommentsByFeed = async (req: Request, res: Response) => {
    const { feed } = req.query;

    const userId =
        (req as any).user?.id ||
        (req as any).user?._id;

    if (!feed || !mongoose.Types.ObjectId.isValid(feed as string)) {
        return res.status(400).json({
            success: false,
            message: "Invalid feed id",
        });
    }

    try {
        const comments = await Comment.find({
            feed,
            isDeleted: false,
        })
            .populate("author", "fullName username avatar")
            .sort({ createdAt: 1 })
            .lean();

        /* 🔥 MAIN FIX */
        const finalComments = comments.map((c: any) => ({
            ...c,
            likedByMe: userId
                ? (c.likedBy || [])
                      .map((id: any) => String(id))
                      .includes(String(userId))
                : false,
        }));

        return res.json({
            success: true,
            data: finalComments,
        });
    } catch (error) {
        console.error("GET_COMMENTS_ERROR:", error);
        return res.status(500).json({
            success: false,
            message: "Unable to fetch comments",
        });
    }
};


export const toggleLikeComment = async (req: Request, res: Response) => {
    const userId =
        (req as any).user?.id ||
        (req as any).user?._id;

    const { commentId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(commentId)) {
        return res.status(400).json({
            success: false,
            message: "Invalid comment id",
        });
    }

    const comment = await Comment.findOne({
        _id: commentId,
        isDeleted: false,
    });

    if (!comment) {
        return res.status(404).json({
            success: false,
            message: "Comment not found",
        });
    }

    const hasLiked = comment.likedBy.some(
        (id) => id.toString() === userId.toString()
    );

    if (hasLiked) {
        // UNLIKE
        await Comment.updateOne(
            { _id: commentId },
            { $pull: { likedBy: userId } }
        );
    } else {
        // LIKE
        await Comment.updateOne(
            { _id: commentId },
            { $addToSet: { likedBy: userId } }
        );
    }

    return res.json({
        success: true,
        liked: !hasLiked,
    });
};
