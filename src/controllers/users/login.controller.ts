import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import User from "../../models/users/users.models";
import { generateOtp } from "../../utils/generateOtp";
import { sendOtpMail } from "../../services/mail/otp.mail";

export const login = async (req: Request, res: Response) => {
  try {
    const email = req.body.email?.toLowerCase().trim();
    const { password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // ✅ IMPORTANT: Google user safety
    if (!user.password) {
      return res.status(400).json({
        success: false,
        message: "Please login using Google",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // ✅ Reuse OTP if still valid
    if (user.otp && user.otpExpiry && user.otpExpiry > new Date()) {
      return res.status(200).json({
        success: true,
        message: "OTP already sent",
        userId: user._id,
        email: user.email,
      });
    }

    // ✅ Generate OTP (5 min)
    const otp = String(generateOtp());
    user.otp = otp;
    user.otpExpiry = new Date(Date.now() + 5 * 60 * 1000);
    user.otpAttempts = 0;
    user.lastOtpSentAt = new Date();
    await user.save();

    // ✅ Respond fast
    res.status(200).json({
      success: true,
      message: "OTP sent to your email",
      userId: user._id,
      email: user.email,
    });

    // ✅ Send mail in background
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
