import { Router } from "express";
import rateLimit from "express-rate-limit";
import { authGuard } from "../../middlewares/auth.middleware";
import {
    followUser,
    unfollowUser,
    isFollowingUser,
    getFollowStatus,
} from "../../controllers/users/feed/follow.controller";

const router = Router();

const followLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 20,
    keyGenerator: (req) => (req as any).user?.id || req.ip,
    standardHeaders: true,
    legacyHeaders: false,
});

router.post("/:userId", authGuard, followLimiter, followUser);
router.delete("/:userId", authGuard, followLimiter, unfollowUser);
router.get("/:userId/is-following", authGuard, isFollowingUser);

/* ⭐ NEW ROUTE */
router.get("/:userId/follow-status", authGuard, getFollowStatus);

export default router;
