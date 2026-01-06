import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import User from "../../models/users/users.models";
import { generateOtp } from "../../utils/generateOtp";
import { sendOtpMail } from "../../services/mail/otp.mail";

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

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

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // 🔒 IMPORTANT FIX: do NOT regenerate OTP if still valid
    if (user.otp && user.otpExpiry && user.otpExpiry > new Date()) {
      return res.status(200).json({
        success: true,
        message: "OTP already sent to your email",
        userId: user._id,
      });
    }

    // 🔐 Generate OTP (STRING)
    const otp = String(generateOtp());
    user.otp = otp;
    user.otpExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
    await user.save();

    console.log("OTP SAVED:", otp); // 🔍 debug (remove later)

    // 📧 Send OTP email
    try {
      await sendOtpMail(user.email, otp);
    } catch (mailError) {
      console.error("OTP MAIL ERROR:", mailError);

      // rollback OTP
      user.otp = undefined;
      user.otpExpiry = undefined;
      await user.save();

      return res.status(500).json({
        success: false,
        message: "Failed to send OTP email. Please try again.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "OTP sent to your email",
      userId: user._id,
    });
  } catch (error) {
    console.error("LOGIN ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Login failed",
    });
  }
};
