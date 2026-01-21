import mongoose from "mongoose";
import Chat from "../../models/chat/Chat";
import MessageRequest from "../../models/chat/MessageRequest";
import { AuthRequest } from "../../middlewares/verifyAccessToken.middleware";
import { Response } from "express";

/* ===============================
   GET /chat/requests
=============================== */
export const getRequests = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const receiverId = new mongoose.Types.ObjectId(req.user._id);

    const requests = await MessageRequest.find({
      receiverId,
    });

    res.status(200).json(requests);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch requests",
    });
  }
};

/* ===============================
   POST /chat/request
=============================== */
export const sendRequest = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const { receiverId, message } = req.body;

    if (!receiverId || !message) {
      return res.status(400).json({
        success: false,
        message: "receiverId and message are required",
      });
    }

    const senderObjectId = new mongoose.Types.ObjectId(req.user._id);
    const receiverObjectId = new mongoose.Types.ObjectId(receiverId);

    const request = await MessageRequest.create({
      senderId: senderObjectId,
      receiverId: receiverObjectId,
      firstMessage: message,
    });

    res.status(201).json(request);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to send request",
    });
  }
};

/* ===============================
   POST /chat/request/accept
=============================== */
export const acceptRequest = async (req: AuthRequest, res: Response) => {
  try {
    const { requestId } = req.body;

    if (!requestId) {
      return res.status(400).json({
        success: false,
        message: "requestId is required",
      });
    }

    const reqData = await MessageRequest.findById(requestId);

    if (!reqData || !reqData.senderId || !reqData.receiverId) {
      return res.status(404).json({
        success: false,
        message: "Request not found",
      });
    }

    const senderId = new mongoose.Types.ObjectId(reqData.senderId);
    const receiverId = new mongoose.Types.ObjectId(reqData.receiverId);

    const chat = await Chat.create({
      participants: [senderId, receiverId],
      isRequest: false,
    });

    await MessageRequest.findByIdAndDelete(requestId);

    res.status(200).json({
      success: true,
      chatId: chat._id, // ✅ now valid
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to accept request",
    });
  }
};

/* ===============================
   POST /chat/request/reject
=============================== */
export const rejectRequest = async (req: AuthRequest, res: Response) => {
  try {
    const { requestId } = req.body;

    if (!requestId) {
      return res.status(400).json({
        success: false,
        message: "requestId is required",
      });
    }

    await MessageRequest.findByIdAndDelete(requestId);

    res.status(200).json({
      success: true,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to reject request",
    });
  }
};
