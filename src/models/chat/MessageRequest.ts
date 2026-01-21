import mongoose from "mongoose";

const requestSchema = new mongoose.Schema(
  {
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    receiverId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    firstMessage: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model("MessageRequest", requestSchema);
