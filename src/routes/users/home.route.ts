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
  max: 30, // thoda zyada, PDF heavy hota hai
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

// 🏠 Home feed (auth required)
router.get("/", notesListLimiter, authGuard, getAllNotes);

// 🌍 Public listing (NO auth, explore screen)
router.get("/public", notesListLimiter, getPublicNotes);

// 👁️ Preview (works for guest + logged in)
// ⚠️ authGuard OPTIONAL so preview works even without login
router.get("/:id/preview", previewLimiter, previewNotePdf);

// 🔓 Full PDF after purchase (auth REQUIRED)
router.get("/:id/file", previewLimiter, authGuard, downloadFullNotePdf);

export default router;