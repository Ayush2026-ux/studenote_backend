import { Schema, model } from "mongoose";

const noteSchema = new Schema(
  {
    title: String,
    thumbnailUrl: String,

    fileUrl: String,
    cloudinaryId: String,

    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },

    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
  },
  { timestamps: true }
);

export default model("Note", noteSchema);
