//routes\users\profile.routes.ts
import { Router } from "express";
import { authGuard } from "../../middlewares/auth.middleware";
import { getProfileStats } from "../../controllers/users/profile/profile.controller";
import { getSaveFeedData } from "../../controllers/users/profile/getsavefeeddata";

const router = Router();

router.get("/stats", authGuard, getProfileStats);
router.get(
    "/saved-feeds",
    authGuard,
    getSaveFeedData
);

export default router;


