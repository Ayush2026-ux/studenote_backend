import { Schema, model, Types } from "mongoose";

export interface ISupportMessage {
  conversationId: Types.ObjectId;
  sender: "user" | "support";
  text?: string;
  imageUrl?: string;
  createdAt: Date;
}

const SupportMessageSchema = new Schema<ISupportMessage>(
  {
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: "SupportConversation",
      required: true,
      index: true,
    },
    sender: {
      type: String,
      enum: ["user", "support"],
      required: true,
    },
    text: String,
    imageUrl: String,
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const SupportMessage = model(
  "SupportMessage",
  SupportMessageSchema
);
