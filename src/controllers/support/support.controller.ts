import { Request, Response } from "express";
import { SupportConversation } from "../../models/support/SupportConversation.model";
import { SupportMessage } from "../../models/support/SupportMessage.model";

/**
 * Create or get active conversation
 */
export const getOrCreateConversation = async (
  req: Request,
  res: Response
) => {
  const { userId } = req.body;

  let convo = await SupportConversation.findOne({
    userId,
    status: { $ne: "RESOLVED" },
  });

  if (!convo) {
    convo = await SupportConversation.create({ userId });
  }

  res.json(convo);
};

/**
 * Send message (user)
 */
export const sendMessage = async (
  req: Request,
  res: Response
) => {
  const { conversationId, text, imageUrl } = req.body;

  const msg = await SupportMessage.create({
    conversationId,
    sender: "user",
    text,
    imageUrl,
  });

  // Mark as under review
  await SupportConversation.findByIdAndUpdate(
    conversationId,
    { status: "UNDER_REVIEW" }
  );

  res.json(msg);
};

/**
 * Get messages of a conversation
 */
export const getMessages = async (
  req: Request,
  res: Response
) => {
  const { conversationId } = req.params;

  const messages = await SupportMessage.find({
    conversationId,
  }).sort({ createdAt: 1 });

  res.json(messages);
};

/**
 * Admin resolves conversation
 */
export const resolveConversation = async (
  req: Request,
  res: Response
) => {
  const { conversationId } = req.params;

  await SupportConversation.findByIdAndUpdate(
    conversationId,
    { status: "RESOLVED" }
  );

  await SupportMessage.create({
    conversationId,
    sender: "support",
    text:
      "Your problem has been resolved. Thank you for contacting support.",
  });

  res.json({ success: true });
};
