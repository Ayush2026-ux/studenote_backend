import express from "express";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import {
  getAllNotes,
  getNotePreview,
} from "../../controllers/users/home/getnotesdatainhome";
import { getPublicNotes } from "../../controllers/users/notes/getNotes.controller";

const router = express.Router();

/* ===============================
   RATE LIMITERS
=============================== */

const notesListLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
});

const previewLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const userId = (req as any).user?._id;
    return userId ? `user:${userId}` : ipKeyGenerator(req as any);
  },
});

/* ===============================
   ROUTES
=============================== */

// 🏠 Home feed
router.get("/", notesListLimiter, getAllNotes);

// 👁️ Preview
router.get("/:id/preview", previewLimiter, getNotePreview);
router.get("/:id/file", previewLimiter, getNotePreview);

// 🌍 Public/Explore listing (different path to avoid clash)
router.get("/public", notesListLimiter, getPublicNotes);

export default router;