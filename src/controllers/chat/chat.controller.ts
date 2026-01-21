import Chat from "../../models/chat/Chat";
import Message from "../../models/chat/Message";
import { AuthRequest } from "../../middlewares/verifyAccessToken.middleware";
import { Response } from "express";

/* ===============================
   GET /chats
=============================== */
export const getChats = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?._id) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const chats = await Chat.find({
      participants: req.user._id, // ✅ CORRECT
      isRequest: false,
    }).sort({ updatedAt: -1 });

    res.status(200).json(chats);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch chats",
    });
  }
};

/* ===============================
   GET /chats/:chatId/messages
=============================== */
export const getMessages = async (req: AuthRequest, res: Response) => {
  try {
    const messages = await Message.find({
      chatId: req.params.chatId,
    }).sort({ createdAt: 1 });

    res.status(200).json(messages);
  } catch {
    res.status(500).json({
      success: false,
      message: "Failed to fetch messages",
    });
  }
};
