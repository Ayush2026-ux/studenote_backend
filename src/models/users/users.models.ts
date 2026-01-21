import mongoose from "mongoose";
import bcrypt from "bcryptjs";

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

    avatar: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },


    /* ================= AUTH ================= */

    password: {
      type: String,
      minlength: 6,
      select: false,
      required: function (this: any): boolean {
        return this.provider === "local";
      },
    },

    provider: {
      type: String,
      enum: ["local", "google"],
      default: "local",
    },

    /* ================= TOKENS ================= */

<<<<<<< HEAD
=======
    // ================= TOKENS ================= //

>>>>>>> 9d460920aa6e04bf3e02186d825468c4ff30cf51
    refreshToken: {
      type: String,
      select: false,
    },

    refreshTokenExpiry: {
      type: Date,
      select: false,
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

    /* ================= CHANGE PASSWORD OTP ================= */

    changePasswordOtp: {
      type: String,
      select: false,
    },

    changePasswordOtpExpiry: {
      type: Date,
      select: false,
    },

    isChangePasswordOtpVerified: {
      type: Boolean,
      default: false,
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
      default: true,
    },

    /* 🔔 EXPO PUSH TOKEN */
    expoPushToken: {
      type: String,
      index: true,
      default: null,
    },

    /* ================= SECURITY META ================= */

    lastLoginAt: {
      type: Date,
    },

    lastLoginIp: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

/* =====================================================
   🔐 PASSWORD HASHING (NO TS ERROR)
===================================================== */

userSchema.pre("save", async function () {
  const user = this as any;

  if (!user.isModified("password")) return;
  if (!user.password) return;

  user.password = await bcrypt.hash(user.password, 10);
});

/* ================= INDEXES ================= */

userSchema.index({ email: 1 });
userSchema.index({ username: 1 });

const User = mongoose.model("User", userSchema);
export default User;
