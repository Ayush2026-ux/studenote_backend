import { Response } from "express";
import { AuthRequest } from "../../middlewares/verifyAccessToken.middleware";
import User from "../../models/users/users.models";
import mongoose from "mongoose";

/**
 * GET /api/users/search?query=rahul
 */
export const searchUsers = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const query = (req.query.query as string)?.trim();

    if (!query) {
      return res.status(200).json([]);
    }

    const currentUserId = new mongoose.Types.ObjectId(req.user._id);

    const users = await User.find({
      _id: { $ne: currentUserId },
      $or: [
        { username: { $regex: query, $options: "i" } },
        { fullName: { $regex: query, $options: "i" } },
      ],
    })
      .select("_id fullName username")
      .limit(10);

    const results = users.map((user) => ({
      _id: user._id,
      name: user.fullName,
      username: user.username,
      isFriend: false, // ✅ SAFE DEFAULT
    }));

    res.status(200).json(results);
  } catch (error) {
    console.error("USER SEARCH ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Failed to search users",
    });
  }
};
