import { Router } from "express";
import { getFeedViews } from "../../controllers/users/feed/feedView.controller";

const router = Router();

/* ================= FEED VIEWS ================= */

// get feed view count
router.get("/:feedId", getFeedViews);

export default router;
