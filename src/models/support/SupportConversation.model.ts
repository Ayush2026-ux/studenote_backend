import { Schema, model, Types } from "mongoose";

export type SupportStatus =
  | "RECORDED"
  | "UNDER_REVIEW"
  | "RESOLVED";

export interface ISupportConversation {
  userId: Types.ObjectId;
  status: SupportStatus;
  lastMessageAt?: Date;   //  useful for sorting chats
  createdAt: Date;
  updatedAt: Date;
}

const SupportConversationSchema = new Schema<ISupportConversation>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",          //  relation
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["RECORDED", "UNDER_REVIEW", "RESOLVED"],
      default: "RECORDED",
      index: true,         //  fast filtering
    },
    lastMessageAt: {
      type: Date,
      index: true,         //  fast chat list sorting
    },
  },
  { timestamps: true }
);

export const SupportConversation = model<ISupportConversation>(
  "SupportConversation",
  SupportConversationSchema
);
