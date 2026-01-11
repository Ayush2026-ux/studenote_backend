import mongoose from "mongoose";

const loginActivitySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    ipAddress: {
      type: String,
    },

    device: {
      type: String,
    },

    userAgent: {
      type: String,
    },
  },
  { timestamps: true }
);

/* 🔥 Fast recent activity queries */
loginActivitySchema.index({ userId: 1, createdAt: -1 });

const LoginActivity = mongoose.model(
  "LoginActivity",
  loginActivitySchema
);

export default LoginActivity;
