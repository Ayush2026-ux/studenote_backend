import { Router } from "express";
import {
  getOrCreateConversation,
  sendMessage,
  getMessages,
  resolveConversation,
} from "../../controllers/support/support.controller";

const router = Router();

router.post("/conversation", getOrCreateConversation);
router.get("/messages/:conversationId", getMessages);
router.post("/message", sendMessage);
router.post("/resolve/:conversationId", resolveConversation);

export default router;
