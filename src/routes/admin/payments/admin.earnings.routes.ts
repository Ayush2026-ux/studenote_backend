import { Router } from "express";
import { adminAuth } from "../../../middlewares/adminAuth.middleware";
import { manualSettleEarnings } from "../../../controllers/admin/payments/earnings.admin.controller";
import { listEarningEvents } from "../../../controllers/admin/payments/earnings.events.admin.controller";

const router = Router();

// Manual earnings settlement (ADMIN ONLY – use carefully)
router.post("/settle-now", adminAuth, manualSettleEarnings as any);
router.get("/events", adminAuth, listEarningEvents as any);


export default router;
