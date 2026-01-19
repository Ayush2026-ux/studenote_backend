import { z } from "zod";
import mongoose from "mongoose";

const objectId = z
  .string()
  .refine(val => mongoose.Types.ObjectId.isValid(val), {
    message: "Invalid user id",
  });

/* ================= FOLLOW ================= */

export const followUserSchema = z.object({
  follower: objectId,
  following: objectId,
}).refine(data => data.follower !== data.following, {
  message: "You cannot follow yourself",
});

/* ================= UNFOLLOW ================= */

export const unfollowUserSchema = z.object({
  follower: objectId,
  following: objectId,
});
