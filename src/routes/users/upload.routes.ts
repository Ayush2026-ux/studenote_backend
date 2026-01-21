import express from "express";
import { uploadNoteFiles } from "../../middlewares/multer";
import { createNote } from "../../controllers/users/upload/uploadnotes.controller";
import { authGuard } from "../../middlewares/auth.middleware";

const router = express.Router();

router.post(
  "/upload",
  authGuard,         
  uploadNoteFiles,   
  createNote          
);

export default router;
