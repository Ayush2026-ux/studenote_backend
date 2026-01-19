import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    /* ================= BASIC INFO ================= */

    username: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
      minlength: 3,
    },

    fullName: {
      type: String,
      required: true,
      minlength: 3,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    mobile: {
      type: String,
      required: true,
      unique: true,
      match: /^[6-9]\d{9}$/,
    },

    avatar: String,

    /* ================= AUTH ================= */

    password: {
      type: String,
      minlength: 6,
      required: function (this: any) {
        return this.provider === "local";
      },
      select: false, // 🔐 NEVER expose password
    },

    provider: {
      type: String,
      enum: ["local", "google"],
      default: "local",
    },


    // ================= TOKENS ================= //

    refreshToken: {
      type: String,
      select: false, // hide by default
    },
    refreshTokenExpiry: {
      type: Date,
      select: false, // hide by default
    },

    /* ================= OTP / SECURITY ================= */

    otp: {
      type: String,
      select: false,
    },

    otpExpiry: {
      type: Date,
      select: false,
    },

    otpAttempts: {
      type: Number,
      default: 0,
      select: false,
    },

    lastOtpSentAt: {
      type: Date,
      select: false,
    },

    /* ================= ACCOUNT STATUS ================= */

    isEmailVerified: {
      type: Boolean,
      default: false,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },

    /* ================= LOGIN ALERT ================= */

    loginAlertEnabled: {
      type: Boolean,
      default: true, // 🔔 ON by default
    },

    /* 🔔 EXPO PUSH TOKEN */
    expoPushToken: {
      type: String,
      index: true,
      default: null,
    },

    /* ================= SECURITY META ================= */

    lastLoginAt: Date,
    lastLoginIp: String,
  },
  { timestamps: true }
);

/* ================= INDEXES ================= */

userSchema.index({ email: 1 });
userSchema.index({ username: 1 });

const User = mongoose.model("User", userSchema);
export default User;
