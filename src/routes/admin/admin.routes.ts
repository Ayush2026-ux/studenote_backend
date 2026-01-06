import { Router } from "express";
import { adminAuth } from "../../middlewares/adminAuth.middleware";
import { approveNote } from "../../controllers/admin/review.controller";

const router = Router(); // ✅ VERY IMPORTANT

router.patch("/notes/:id/approve", adminAuth, approveNote);

export default router;
