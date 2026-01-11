import express from "express";
import { uploadNoteFiles } from "../../middlewares/multer";
import { createNote } from "../../controllers/users/upload/uploadnotes.controller";
import { authGuard } from "../../middlewares/auth.middleware";

const router = express.Router();

// Simplify the route definition
// router.post(
//     "/upload", // Use a clean path
//     authGuard,
//     uploadNoteFiles, // Let Multer run as standard middleware
//     createNote as any
// );
router.post("/upload", authGuard, uploadNoteFiles, createNote);


export default router;