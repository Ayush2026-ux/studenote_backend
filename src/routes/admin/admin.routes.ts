import { Router } from "express";
import { adminAuth } from "../../middlewares/adminAuth.middleware";

import authRoutes from "./auth.routes";
import usersRoutes from "./users/adminGetAllUsers";

const router = Router(); //  VERY IMPORTANT

/* ================= AUTH ROUTES ================= */
router.use("/auth", authRoutes);

/* ================= USERS ROUTES ================= */
router.use("/users", usersRoutes);

/* ================= PROTECTED ROUTES ================= */
// router.patch("/notes/:id/approve", adminAuth, approveNote);

export default router;
