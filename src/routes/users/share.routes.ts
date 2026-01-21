import { Router } from "express";
import { authGuard } from "../../middlewares/auth.middleware";
import { shareNote } from "../../controllers/users/feed/note.controller";

const router = Router();

router.post("/:noteId/share", authGuard, shareNote);

export default router;
