import { Router } from "express";
import rateLimit from "express-rate-limit";
import { authGuard } from "../../middlewares/auth.middleware";
import {
    addComment,
    deleteComment,
    getCommentsByFeed,
    toggleLikeComment,
} from "../../controllers/users/feed/comment.controller";

const router = Router();

/* ======================================================
   RATE LIMITER (ANTI-SPAM)
====================================================== */

const commentLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    keyGenerator: (req) => (req as any).user?._id || req.ip, // ✅ FIX
    standardHeaders: true,
    legacyHeaders: false,
});

/* ======================================================
   COMMENT ROUTES
====================================================== */

router.post("/", authGuard, commentLimiter, addComment);
router.delete("/:commentId", authGuard, deleteComment);
router.get("/", authGuard, getCommentsByFeed);
router.post("/:commentId/like", authGuard, toggleLikeComment);


export default router;
