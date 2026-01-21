import { Router } from "express";
import { verifyAccessToken } from "../../middlewares/verifyAccessToken.middleware";
import { searchUsers } from "../../controllers/chat/user.search.controller";

const router = Router();

/**
 * GET /users/search?query=rahul
 */
router.get(
  "/users/search",
  verifyAccessToken,
  searchUsers
);

export default router;
