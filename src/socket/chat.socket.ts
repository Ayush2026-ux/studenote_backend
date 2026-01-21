import { Server, Socket } from "socket.io";
import mongoose from "mongoose";
import Message from "../models/chat/Message";

interface SendMessagePayload {
  chatId: string;
  text: string;
  senderId: string;
}

export const chatSocket = (io: Server) => {
  io.on("connection", (socket: Socket) => {
    console.log("🟢 Socket connected:", socket.id);

    socket.on("join_chat", (chatId: string) => {
      socket.join(chatId);
    });

    socket.on(
      "send_message",
      async ({ chatId, text, senderId }: SendMessagePayload) => {
        try {
          const message = await Message.create({
            chatId: new mongoose.Types.ObjectId(chatId),
            senderId: new mongoose.Types.ObjectId(senderId),
            text,
          });

          io.to(chatId).emit("receive_message", message);
        } catch (error) {
          console.error("❌ send_message error:", error);
        }
      }
    );

    socket.on("disconnect", () => {
      console.log("🔴 Socket disconnected:", socket.id);
    });
  });
};
