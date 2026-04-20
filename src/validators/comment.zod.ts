import { z } from "zod";
import mongoose from "mongoose";

/* ================= OBJECT ID ================= */

const objectId = z
    .string()
    .trim()
    .refine(val => mongoose.Types.ObjectId.isValid(val), {
        message: "Invalid ObjectId",
    });

/* ================= ADD COMMENT ================= */

export const createCommentSchema = z
    .object({
        feed: objectId,
        note: objectId.optional(),
        author: objectId,

        /// 🔥 FLEXIBLE INPUT (FIX)
        content: z.string().trim().min(1).max(500).optional(),
        text: z.string().trim().min(1).max(500).optional(),

        parentComment: objectId.optional().nullable(),
    })
    .refine(
        (data) => data.content || data.text,
        {
            message: "Comment cannot be empty",
        }
    )
    .transform((data) => ({
        ...data,

        /// 🔥 NORMALIZE TO content
        content: data.content ?? data.text,

        parentComment: data.parentComment ?? undefined,
    }));

/* ================= LIKE / UNLIKE ================= */

export const likeCommentSchema = z.object({
    commentId: objectId,
});

/* ================= DELETE COMMENT ================= */

export const deleteCommentSchema = z.object({
    commentId: objectId,
});