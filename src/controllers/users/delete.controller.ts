import { Request, Response } from "express";
import cloudinary from "../../config/cloudinary"; // ✅ FIXED


export const deleteFile = async (req: Request, res: Response) => { 
    

  const { publicId } = req.body;

  await cloudinary.uploader.destroy(publicId, {
    resource_type: "raw", // PDF
  });

  res.json({ success: true });
};
