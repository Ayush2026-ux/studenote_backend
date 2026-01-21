import { Router } from "express";
import {
  getRequests,
  sendRequest,
  acceptRequest,
  rejectRequest,
} from "../../controllers/chat/request.controller";
import { verifyAccessToken } from "../../middlewares/verifyAccessToken.middleware";

const router = Router();

/* =========================
   MESSAGE REQUESTS
========================= */

/**
 * GET /chat/requests
 * Get incoming message requests
 */
router.get(
  "/chat/requests",
  verifyAccessToken,
  getRequests
);

/**
 * POST /chat/request
 * Send message request to a user
 */
router.post(
  "/chat/request",
  verifyAccessToken,
  sendRequest
);

/**
 * POST /chat/request/accept
 * Accept a message request
 */
router.post(
  "/chat/request/accept",
  verifyAccessToken,
  acceptRequest
);

/**
 * POST /chat/request/reject
 * Reject a message request
 */
router.post(
  "/chat/request/reject",
  verifyAccessToken,
  rejectRequest
);

export default router;
