// src/routes/home.routes.ts
import express from "express";
import { getAllNotes, getNotePreview } from "../../controllers/users/home/getnotesdatainhome";


const router = express.Router();

// GET /api/notes
router.get("/", getAllNotes);

// GET /api/notes/:id/preview
router.get("/:id/preview", getNotePreview);

// (optional alias)
router.get("/:id/file", getNotePreview);

export default router;