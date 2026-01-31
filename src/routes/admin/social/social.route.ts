import { Router } from "express";
import { adminAuth } from "../../../middlewares/adminAuth.middleware";
import { getSocialData, getSinglePost } from "../../../controllers/admin/social/getSocialData";

const router = Router();

/* ================= GET ROUTES ================= */

/**
 * Get all social feed posts with moderation data
 * @route GET /api/admin/social/posts
 * @query status - Filter: all, active, flagged, reported
 * @query limit - Posts per page (default: 10)
 * @query page - Page number (default: 1)
 */
router.get("/posts", adminAuth, getSocialData);

/**
 * Get single post details
 * @route GET /api/admin/social/posts/:postId
 */
router.get("/posts/:postId", adminAuth, getSinglePost);

export default router;
