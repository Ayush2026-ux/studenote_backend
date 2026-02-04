import { Router } from "express";
import { adminAuth } from "../../middlewares/adminAuth.middleware";
import { forceRefundProcessing, getNearCompletionRefunds, getRefundStats, getSchedulerStatus, manualRefundProcessing } from "../../controllers/admin/payments/refund.admin.controller";


const router = Router();

// Admin routes for refund management
router.get("/stats", adminAuth, getRefundStats as any);
router.get("/near-completion", adminAuth, getNearCompletionRefunds as any);
router.get("/scheduler-status", adminAuth, getSchedulerStatus as any);
router.post("/manual-process", adminAuth, manualRefundProcessing as any);
router.post("/force-process", adminAuth, forceRefundProcessing as any);

export default router;
