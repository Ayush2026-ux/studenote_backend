import { Router } from "express";
import rateLimit from "express-rate-limit";
import { authGuard } from "../../middlewares/auth.middleware";
import {
    hasSavedFeed,
    saveFeed,
    unsaveFeed,
} from "../../controllers/users/feed/save.controller";

const router = Router();

/* ======================================================
   RATE LIMITER (ANTI-SPAM)
====================================================== */

const saveLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 20,            // 20 save/unsave actions per minute
    keyGenerator: (req) => {
        return (req as any).user.id; // ✅ rate limit per user
    },
    standardHeaders: true,
    legacyHeaders: false,
});

/* ======================================================
   SAVE ROUTES
====================================================== */

// Save feed
router.post("/:feedId", authGuard, saveLimiter, saveFeed);

// Unsave feed
router.delete("/:feedId", authGuard, saveLimiter, unsaveFeed);

router.get("/:feedId/has-saved", authGuard, hasSavedFeed);


export default router;
