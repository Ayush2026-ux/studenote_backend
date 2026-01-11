import mongoose from "mongoose";

const sessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // 🔥 THIS IS REFRESH TOKEN
    token: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    ipAddress: String,
    device: String,
    userAgent: String,

    lastActiveAt: {
      type: Date,
      default: Date.now,
    },

    isRevoked: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  { timestamps: true }
);

/* 🔥 Auto delete session after 30 days */
sessionSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 60 * 60 * 24 * 30 }
);

const Session = mongoose.model("Session", sessionSchema);
export default Session;
