import { Router } from "express";
import { authGuard } from "../../middlewares/auth.middleware";
import { getProfileStats } from "../../controllers/users/profile/profile.controller";

const router = Router();

router.get("/stats", authGuard, getProfileStats);

export default router;
