//routes\users\profile.routes.ts
import { Router } from "express";
import { authGuard } from "../../middlewares/auth.middleware";
import { getProfileStats } from "../../controllers/users/profile/profile.controller";
import { getSaveFeedData } from "../../controllers/users/profile/getsavefeeddata";
import { getPurchasedNotes } from "../../controllers/users/profile/getPurchesedNotes";
import { getMyNotesList } from "../../controllers/users/profile/myNotes.controller";

const router = Router();

router.get("/stats", authGuard, getProfileStats);
router.get(
    "/saved-feeds",
    authGuard,
    getSaveFeedData
);

router.get("/purchased-notes", authGuard, getPurchasedNotes);
router.get("/my-notes", authGuard, getMyNotesList);


export default router;


