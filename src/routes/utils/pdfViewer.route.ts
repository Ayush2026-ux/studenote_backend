import { Router } from "express";
import { previewNotePdf } from "../../controllers/users/preview.controller"; 
// 👆 apne actual controller ka correct path lagana

const router = Router();

/**
 * GET /api/preview/:id
 * Returns signed URL for PDF preview
 */
router.get("/preview/:id", previewNotePdf);

export default router;