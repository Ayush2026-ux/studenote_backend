import { Router } from "express";
import rateLimit from "express-rate-limit";

import {
    createFeed,
    toggleLikeFeed,
    registerFeedView,
    shareFeed,
    getFeeds,
} from "../../controllers/users/feed/feed.controller";

import { authGuard } from "../../middlewares/auth.middleware";

const router = Router();

/* ================= RATE LIMITER ================= */

const viewLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    keyGenerator: (req) => (req as any).user?.id || req.ip,
    standardHeaders: true,
    legacyHeaders: false,
});

/* ================= FEED ROUTES ================= */
router.get("/", getFeeds);
// Create feed
router.post("/", authGuard, createFeed);

// Like / Unlike
router.post("/:feedId/like", authGuard, toggleLikeFeed);

// Register view (guest + auth)
router.post(
    "/:feedId/view",
    viewLimiter,
    registerFeedView
);

// Share feed
router.post("/:feedId/share", authGuard, shareFeed);

export default router;
