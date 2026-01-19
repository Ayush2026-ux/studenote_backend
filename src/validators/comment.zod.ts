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
        note: objectId.optional(), // ✅ optional (fixes 400)
        author: objectId,

        content: z
            .string()
            .trim()
            .min(1, "Comment cannot be empty")
            .max(500, "Comment cannot exceed 500 characters"),

        parentComment: objectId.optional().nullable(),
    })
    .transform(data => ({
        ...data,
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
