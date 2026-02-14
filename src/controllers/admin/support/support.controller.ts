import { Request, Response } from "express";
import mongoose from "mongoose";
import { SupportConversation } from "../../../models/support/SupportConversation.model";
import { SupportMessage } from "../../../models/support/SupportMessage.model";

/*  LIST CONVERSATIONS  */
export const listConversations = async (req: Request, res: Response) => {
    try {
        const status = req.query.status as string;

        const filter: any = {};
        if (status) filter.status = status;

        const conversationsRaw = await SupportConversation.find(filter)
            .populate({
                path: "userId",
                select: "fullName email avatar",
                options: { strictPopulate: false }, // prevent populate errors
            })
            .sort({ lastMessageAt: -1, createdAt: -1 })
            .limit(50)
            .lean();

        // Filter out broken conversations where user was deleted
        const conversations = conversationsRaw.filter((c: any) => c.userId);

        res.json({ success: true, data: conversations });
    } catch (e) {
        console.error("listConversations error:", e);
        res.status(500).json({ success: false, message: "Failed to load chats" });
    }
};

/*  GET MESSAGES  */
export const getConversationMessages = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res
                .status(400)
                .json({ success: false, message: "Invalid conversation id" });
        }

        const messages = await SupportMessage.find({ conversationId: id })
            .sort({ createdAt: 1 })
            .lean();

        res.json({
            success: true,
            data: messages
        });
    } catch (e) {
        console.error("getConversationMessages error:", e);
        res.status(500).json({
            success: false,
            message: "Failed to load messages"
        });
    }
};

/*  ADMIN REPLY  */
export const replyToConversation = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { text, imageUrl } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res
                .status(400)
                .json({
                    success: false,
                    message: "Invalid conversation id"
                });
        }

        if (!text && !imageUrl) {
            return res
                .status(400)
                .json({
                    success: false,
                    message: "Message is required"
                });
        }

        const message = await SupportMessage.create({
            conversationId: id,
            sender: "support",
            text,
            imageUrl,
        });

        await SupportConversation.findByIdAndUpdate(id, {
            status: "UNDER_REVIEW",
            lastMessageAt: new Date(),
        });

        res.json({ success: true, data: message });
    } catch (e) {
        console.error("replyToConversation error:", e);
        res.status(500).json({ success: false, message: "Reply failed" });
    }
};

/*  UPDATE STATUS  */
export const updateConversationStatus = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res
                .status(400)
                .json({ success: false, message: "Invalid conversation id" });
        }

        if (!["RECORDED", "UNDER_REVIEW", "RESOLVED"].includes(status)) {
            return res
                .status(400)
                .json({ success: false, message: "Invalid status" });
        }

        await SupportConversation.findByIdAndUpdate(id, { status });

        res.json({ success: true, message: "Status updated" });
    } catch (e) {
        console.error("updateConversationStatus error:", e);
        res.status(500).json({ success: false, message: "Status update failed" });
    }
};
