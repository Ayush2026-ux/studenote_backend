import { z } from "zod";
import mongoose from "mongoose";

/* ================= HELPERS ================= */

const objectId = z
    .string()
    .refine(val => mongoose.Types.ObjectId.isValid(val), {
        message: "Invalid ObjectId",
    });

/* ================= CREATE FEED ================= */

export const createFeedSchema = z.object({
    author: objectId,
    note: objectId,

    visibility: z.enum(["public", "followers"], {
        message: "Visibility must be public or followers",
    }),
});

/* ================= UPDATE METRICS ================= */

export const updateFeedMetricsSchema = z.object({
    views: z.number().int().nonnegative().optional(),
    likes: z.number().int().nonnegative().optional(),
    commentsCount: z.number().int().nonnegative().optional(),
    shares: z.number().int().nonnegative().optional(),

    score: z.number().nonnegative().optional(),
    isActive: z.boolean().optional(),
});
