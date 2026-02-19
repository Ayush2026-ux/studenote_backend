import { Router } from "express";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { authGuard } from "../../middlewares/auth.middleware";
import {
    followUser,
    unfollowUser,
    isFollowingUser,
    getFollowStatus,
} from "../../controllers/users/feed/follow.controller";

const router = Router();

const followLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,

    keyGenerator: (req, res) => {
        const userId = (req as any)?.user?._id;

        // Logged-in user → rate limit per user
        if (userId) {
            return `user:${userId.toString()}`;
        }

        // Guest → IPv6-safe IP-based rate limit
        return ipKeyGenerator(req as any);
    },
});

router.post("/:userId", authGuard, followLimiter, followUser);
router.delete("/:userId", authGuard, followLimiter, unfollowUser);
router.get("/:userId/is-following", authGuard, isFollowingUser);

/* ⭐ NEW ROUTE */
router.get("/:userId/follow-status", authGuard, getFollowStatus);

export default router;
