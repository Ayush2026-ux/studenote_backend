import { Router } from "express";
import { authGuard } from "../../middlewares/auth.middleware";
import {
    hasLikedFeed,
    getUserLikedFeeds,
} from "../../controllers/users/feed/feedLike.controller";

const router = Router();

/* ================= FEED LIKES ================= */

// check if liked
router.get("/:feedId/has-liked", authGuard, hasLikedFeed);

// user liked feeds
router.get("/me", authGuard, getUserLikedFeeds);

export default router;
