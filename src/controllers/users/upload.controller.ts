import { Request, Response } from "express";
import cloudinary from "../../config/cloudinary";
import fs from "fs";

export const uploadFile = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "File is required",
      });
    }

    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: "studenote/files",
      resource_type: "raw", // PDF / DOC
    });

    // 🔥 local file delete (important)
    fs.unlinkSync(req.file.path);

    return res.status(201).json({
      success: true,
      fileUrl: result.secure_url,
      cloudinaryId: result.public_id,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return res.status(500).json({
      success: false,
      message: "Upload failed",
    });
  }
};
