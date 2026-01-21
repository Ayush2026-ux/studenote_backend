import { Response } from "express";
import fs from "fs";
import mongoose from "mongoose";
import User from "../../models/users/users.models";
import { AuthRequest } from "../../middlewares/auth.middleware";
import { getGridFS } from "../../config/gridfs";

export const uploadAvatarController = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    // ✅ SUPPORT BOTH userId AND id
    const userId =
      (req.user as any)?.userId ||
      (req.user as any)?.id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const file = req.file;
    if (!file) {
      return res.status(400).json({ message: "No image uploaded" });
    }

    const gfs = getGridFS();
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    /* 🔥 DELETE OLD AVATAR */
    if (user.avatar) {
      try {
        await gfs.delete(new mongoose.Types.ObjectId(user.avatar));
      } catch {
        // ignore if already deleted
      }
    }

    /* 🔼 UPLOAD NEW AVATAR */
    const uploadStream = gfs.openUploadStream(`avatar-${userId}`, {
      metadata: {
        mimetype: file.mimetype,
      },
    });

    fs.createReadStream(file.path).pipe(uploadStream);

    uploadStream.on("finish", async () => {
      user.avatar = uploadStream.id as mongoose.Types.ObjectId;
      await user.save();

      // 🧹 cleanup temp file
      fs.unlink(file.path, () => {});

      return res.status(200).json({
        success: true,
        user,
      });
    });

    uploadStream.on("error", (err) => {
      console.error("GridFS upload error:", err);
      return res.status(500).json({
        message: "Avatar upload failed",
      });
    });
  } catch (err) {
    console.error("UPLOAD AVATAR ERROR:", err);
    return res.status(500).json({
      message: "Server error",
    });
  }
};
