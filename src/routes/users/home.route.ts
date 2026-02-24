import express from "express";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";

import { authGuard } from "../../middlewares/auth.middleware";
import { getAllNotes } from "../../controllers/users/home/getnotesdatainhome";
import {
  getPublicNotes,
  previewNotePdf,
  downloadFullNotePdf,
} from "../../controllers/users/notes/getNotes.controller";

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
router.get("/", notesListLimiter, authGuard, getAllNotes);

// 🌍 Public listing
router.get("/public", notesListLimiter, getPublicNotes);

// 👁️ Preview (10 pages only)
router.get("/:id/preview", previewLimiter, authGuard, previewNotePdf);

// 🔓 Full PDF after purchase
router.get("/:id/file", previewLimiter, authGuard, downloadFullNotePdf);

export default router;