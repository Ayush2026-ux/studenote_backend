import { Schema, model, Types } from "mongoose";

export type SupportStatus =
  | "RECORDED"
  | "UNDER_REVIEW"
  | "RESOLVED";

export interface ISupportConversation {
  userId: Types.ObjectId;
  status: SupportStatus;
  createdAt: Date;
  updatedAt: Date;
}

const SupportConversationSchema = new Schema<ISupportConversation>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["RECORDED", "UNDER_REVIEW", "RESOLVED"],
      default: "RECORDED",
    },
  },
  { timestamps: true }
);

export const SupportConversation = model(
  "SupportConversation",
  SupportConversationSchema
);
