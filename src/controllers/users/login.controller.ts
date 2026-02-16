import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import User from "../../models/users/users.models";
import { generateOtp } from "../../utils/generateOtp";
import { sendOtpMail } from "../../services/mail/otp.mail";

/* =====================================================
   LOGIN CONTROLLER (OTP BASED)
   STEP 1: Email + Password → Send OTP
===================================================== */

export const login = async (req: Request, res: Response) => {
  try {
    /* ================= SAFE BODY ================= */
    const body = req.body || {};

    const email =
      typeof body.email === "string"
        ? body.email.toLowerCase().trim()
        : "";

    const password =
      typeof body.password === "string"
        ? body.password
        : "";

    /* ================= BASIC VALIDATION ================= */
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    /* ================= FIND USER ================= */
    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    /* ================= GOOGLE USER SAFETY ================= */
    if (!user.password) {
      return res.status(400).json({
        success: false,
        message: "Please login using Google",
      });
    }

    /* ================= PASSWORD CHECK ================= */
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    /* ================= ACCOUNT STATUS ================= */
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "Account is disabled",
      });
    }

    /* =================================================
       UPDATE LAST LOGIN (THIS WAS MISSING)
       This fixes "Last Login" date in Login & Security
    ================================================= */

    user.lastLoginAt = new Date();
    user.lastLoginIp = req.ip;

    /* ================= GENERATE OTP ================= */
    const otp = String(generateOtp());

    user.otp = otp;
    user.otpExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
    user.otpAttempts = 0;
    user.lastOtpSentAt = new Date();

    await user.save();

    // DEV ONLY (remove in production)
    console.log("LOGIN OTP:", otp);

    /* ================= RESPONSE ================= */
    res.status(200).json({
      success: true,
      message: "OTP sent to your email",
      userId: user._id,
      email: user.email,
    });

    /* ================= SEND OTP EMAIL (ASYNC) ================= */
    sendOtpMail(user.email, otp).catch((err) => {
      console.error("OTP MAIL ERROR:", err);
    });
  } catch (error) {
    console.error("LOGIN ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Login failed",
    });
  }
};


