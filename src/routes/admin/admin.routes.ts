import { Router } from "express";
import { adminAuth } from "../../middlewares/adminAuth.middleware";

import authRoutes from "./auth.routes";
import usersRoutes from "./users/adminGetAllUsers";
import payoutRoutes from "./payments/admin.payout.routes";
import earningsRoutes from "./payments/admin.earnings.routes";

const router = Router(); //  VERY IMPORTANT

/* ================= AUTH ROUTES ================= */
router.use("/auth", authRoutes);

/* ================= USERS ROUTES ================= */
router.use("/users", usersRoutes);

/* ================= PAYMENTS ROUTES ================= */
router.use("/payouts", payoutRoutes);
router.use("/earnings", earningsRoutes);

/* ================= PROTECTED ROUTES ================= */
// router.patch("/notes/:id/approve", adminAuth, approveNote);

export default router;
