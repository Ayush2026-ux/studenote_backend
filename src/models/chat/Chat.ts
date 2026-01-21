import mongoose from "mongoose";

const chatSchema = new mongoose.Schema(
  {
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    isRequest: { type: Boolean, default: false },
    lastMessage: { type: String },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model("Chat", chatSchema);
