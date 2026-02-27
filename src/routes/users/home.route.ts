// routes/users/home.route.ts

import express from "express";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";

import { authGuard } from "../../middlewares/auth.middleware";
import { getAllNotes } from "../../controllers/users/home/getnotesdatainhome";
import {
  getPublicNotes,
  previewNotePdf,
} from "../../controllers/users/notes/getNotes.controller";

const router = express.Router();

/* ================= RATE LIMITERS ================= */

const notesListLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
});

const previewLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const userId = (req as any).user?._id;
    return userId ? `user:${userId}` : ipKeyGenerator(req as any);
  },
});

/* ================= ROUTES ================= */

//  Home feed (auth required)
router.get("/", notesListLimiter, authGuard, getAllNotes);

//  Public explore (no file URLs exposed)
router.get("/public", notesListLimiter, getPublicNotes);

//  Secure Preview + Full Stream (single endpoint only)
// Bought → full PDF
// Not bought → 10 page watermarked preview
router.get("/:id/preview", previewLimiter, authGuard, previewNotePdf);

export default router;