import { Router } from "express";
import { adminAuth } from "../../../middlewares/adminAuth.middleware";
import { getConversationMessages, listConversations, replyToConversation, updateConversationStatus } from "../../../controllers/admin/support/support.controller";


const router = Router();

router.get("/conversations", adminAuth, listConversations);              // List chats
router.get("/conversations/:id", adminAuth, getConversationMessages);   // Chat messages
router.post("/conversations/:id/reply", adminAuth, replyToConversation);// Admin reply
router.patch("/conversations/:id/status", adminAuth, updateConversationStatus); // Change status

export default router;
