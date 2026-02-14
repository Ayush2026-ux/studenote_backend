import { Router } from "express";
import { adminAuth } from "../../../middlewares/adminAuth.middleware";
import {
    approvePayout,
    completePayout,
    listPendingPayouts,
    rejectPayoutHandler,
    updatePayoutDetails,
} from "../../../controllers/admin/payments/payout.admin.controller";
import { listAllPayouts } from "../../../controllers/admin/payments/payouts.admin.controller";

const router = Router();

router.get("/pending", adminAuth, listPendingPayouts as any);
router.get("/", adminAuth, listAllPayouts as any);
router.post("/:payoutId/approve", adminAuth, approvePayout as any);
router.post("/:payoutId/complete", adminAuth, completePayout as any);
router.post("/:payoutId/reject", adminAuth, rejectPayoutHandler as any);
router.put("/:payoutId", adminAuth, updatePayoutDetails as any);

export default router;
