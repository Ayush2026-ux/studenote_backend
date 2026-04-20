import { Router } from "express";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { authGuard } from "../../middlewares/auth.middleware";

import {
    toggleFollowUser,   // ✅ NEW
    isFollowingUser,
    getFollowStatus,
} from "../../controllers/users/feed/follow.controller";

const router = Router();

/* ================= RATE LIMIT ================= */

const followLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,

    keyGenerator: (req) => {
        const userId = (req as any)?.user?._id;

        // ✅ Logged-in → per user
        if (userId) {
            return `user:${userId.toString()}`;
        }

        // ✅ Guest → IP based
        return ipKeyGenerator(req as any);
    },
});

/* ================= ROUTES ================= */

/// 🔥 TOGGLE FOLLOW (FOLLOW + UNFOLLOW)
router.post("/:userId", authGuard, followLimiter, toggleFollowUser);

/// 🔍 CHECK SIMPLE FOLLOW
router.get("/:userId/is-following", authGuard, isFollowingUser);

/// ⭐ FOLLOW STATUS (follow | following | follow_back | self)
router.get("/:userId/follow-status", authGuard, getFollowStatus);

export default router;