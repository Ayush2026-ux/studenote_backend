import { Router } from "express";
import { adminAuth } from "../../../middlewares/adminAuth.middleware";
import {
    getAdminStats,
    getGrowthTrends,
    getRevenueByCategory,
} from "../../../controllers/admin/dashboard/dashboard.controller";

const router = Router();

router.get("/stats", adminAuth, getAdminStats);
router.get("/trends", adminAuth, getGrowthTrends);
router.get("/revenue-by-category", adminAuth, getRevenueByCategory);

export default router;
