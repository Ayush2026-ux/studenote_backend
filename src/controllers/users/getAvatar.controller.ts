import { Request, Response } from "express";
import mongoose from "mongoose";
import { getGridFS } from "../../config/gridfs";

export const getAvatarController = async (
  req: Request,
  res: Response
) => {
  try {
    const gfs = getGridFS();
    const fileId = new mongoose.Types.ObjectId(req.params.id);

    const stream = gfs.openDownloadStream(fileId);
    res.set("Content-Type", "image/jpeg");

    stream.pipe(res);
  } catch {
    res.status(404).json({ message: "Avatar not found" });
  }
};
