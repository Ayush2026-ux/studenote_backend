import { Router } from "express";
import { previewNotePdf } from "../../controllers/users/preview.controller";
import { authGuard } from "../../middlewares/auth.middleware";

const router = Router();

/**
 * GET /api/preview/:id
 * Returns signed URL for PDF preview
 */
router.get("/preview/:id", authGuard, previewNotePdf);

export default router;