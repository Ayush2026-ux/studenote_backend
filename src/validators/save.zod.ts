import { z } from "zod";
import mongoose from "mongoose";

const objectId = z
    .string()
    .refine(val => mongoose.Types.ObjectId.isValid(val), {
        message: "Invalid ObjectId",
    });

/* ================= SAVE FEED ================= */

export const saveFeedSchema = z.object({
    user: objectId,
    feed: objectId,
});

/* ================= UNSAVE ================= */

export const unsaveFeedSchema = z.object({
    user: objectId,
    feed: objectId,
});
