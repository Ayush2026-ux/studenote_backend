import { Router } from "express";
import {
  getChats,
  getMessages,
} from "../../controllers/chat/chat.controller";
import { verifyAccessToken } from "../../middlewares/verifyAccessToken.middleware";

const router = Router();

/* =========================
   CHAT INBOX (FRIENDS)
========================= */

/**
 * GET /chats
 * Get all accepted chats (Inbox)
 */
router.get(
  "/chats",
  verifyAccessToken,
  getChats
);

/* =========================
   CHAT MESSAGES
========================= */

/**
 * GET /chats/:chatId/messages
 * Get messages of a specific chat
 */
router.get(
  "/chats/:chatId/messages",
  verifyAccessToken,
  getMessages
);

export default router;
