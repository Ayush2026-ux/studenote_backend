import mongoose from "mongoose";

const sessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    location: {
      type: String, // e.g. "Delhi, India"
    },


    token: {
      type: String, // 🔥 refresh token
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

// 🔥 Auto delete after 30 days
sessionSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 60 * 60 * 24 * 30 }
);

const Session = mongoose.model("Session", sessionSchema);
export default Session;
