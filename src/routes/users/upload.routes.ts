import express from "express";
import { uploadNoteFiles } from "../../middlewares/multer";
import { createNote } from "../../controllers/users/upload/uploadnotes.controller";
import { authGuard } from "../../middlewares/auth.middleware";

const router = express.Router();

// ✅ ERROR HANDLING MIDDLEWARE FOR MULTER
const multerErrorHandler = (err: any, _req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({
      success: false,
      message: "File size exceeds 100 MB limit",
    });
  }
  if (err.code === "LIMIT_FILE_COUNT") {
    return res.status(400).json({
      success: false,
      message: "Too many files uploaded",
    });
  }
  if (err.message?.includes("Unexpected field")) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
  if (err) {
    return res.status(400).json({
      success: false,
      message: err.message || "File upload error",
    });
  }
  next();
};

router.post(
  "/upload",
  authGuard,
  uploadNoteFiles,
  multerErrorHandler,
  createNote
);

export default router;
