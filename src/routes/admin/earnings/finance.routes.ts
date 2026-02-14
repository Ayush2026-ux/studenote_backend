// routes/admin/finance.routes.ts
import { Router } from "express";
import { adminAuth } from "../../../middlewares/adminAuth.middleware";
import { approvePayout, getFinanceSummary, listPayoutRequests, listTransactions, rejectPayout, revenueAnalytics } from "../../../controllers/admin/earnings/finance.controller";

const router = Router();

router.get("/summary", adminAuth, getFinanceSummary);
router.get("/transactions", adminAuth, listTransactions);
router.get("/payouts", adminAuth, listPayoutRequests);
router.post("/payouts/:payoutId/approve", adminAuth, approvePayout);
router.post("/payouts/:payoutId/reject", adminAuth, rejectPayout);
router.get("/revenue-analysis", adminAuth, revenueAnalytics);


export default router;
