import { Request, Response, NextFunction } from "express";

const allowedTypes = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

export const validateFile = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.file) {
    return res.status(400).json({ message: "File required" });
  }

  if (!allowedTypes.includes(req.file.mimetype)) {
    return res.status(400).json({ message: "Only PDF or Word allowed" });
  }

  if (req.file.size > 50 * 1024 * 1024) {
    return res.status(400).json({ message: "Max 50MB allowed" });
  }

  next();
};
