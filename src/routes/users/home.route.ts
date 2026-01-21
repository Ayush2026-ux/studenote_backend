// src/routes/home.routes.ts

import express from "express";
import rateLimit from "express-rate-limit";
import {
    getAllNotes,
    getNotePreview,
} from "../../controllers/users/home/getnotesdatainhome";

const router = express.Router();

/* ===============================
   RATE LIMITERS
=============================== */

// 🔍 Notes list (search + scroll)
const notesListLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 30,            // 30 requests/min
    standardHeaders: true,
    legacyHeaders: false,
});

// 📄 PDF Preview (HEAVY)
const previewLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 15,                 //  15 previews only
    keyGenerator: (req) =>
        (req as any).user?.id || req.ip,
    standardHeaders: true,
    legacyHeaders: false,
});

/* ===============================
   ROUTES
=============================== */

// GET /api/notes?search=&page=
router.get("/", notesListLimiter, getAllNotes);

// GET /api/notes/:id/preview
router.get("/:id/preview", previewLimiter, getNotePreview);

// Optional alias (same limiter)
router.get("/:id/file", previewLimiter, getNotePreview);

export default router;
