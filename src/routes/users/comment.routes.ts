import { Request, Response, Router } from "express";
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

export const commentLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,

    //  IPV6-SAFE KEY GENERATOR
    keyGenerator: (req, res) => {
        // If user is logged in → rate limit by userId
        if ((req as any).user?._id) {
            return `user:${(req as any).user._id.toString()}`;
        }

        // Otherwise → rate limit by IP (IPv6-safe)
        return ipKeyGenerator(req, res);
    },
});

/* ======================================================
   COMMENT ROUTES
====================================================== */

router.post("/", authGuard, commentLimiter, addComment);
router.delete("/:commentId", authGuard, commentLimiter, deleteComment);
router.get("/", authGuard, getCommentsByFeed);
router.post("/:commentId/like", authGuard, commentLimiter, toggleLikeComment);


function ipKeyGenerator(req: Request, res: Response): string {
    // Extract IP address from request, handling IPv6
    const ip = req.ip || req.socket.remoteAddress || "unknown";
    return `ip:${ip}`;
}

export default router;

