import User from "../../models/users/users.models";
import { Request, Response } from "express";

export const verifyForgotOtp = async (req: Request, res: Response) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: "Email and OTP required" });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() }).select("+otp +otpExpiry");

    if (!user || !user.otp || !user.otpExpiry) {
      return res.status(400).json({ message: "OTP expired or not found" });
    }

    if (new Date(user.otpExpiry).getTime() < Date.now()) {
      return res.status(400).json({ message: "OTP expired" });
    }

    if (String(user.otp) !== String(otp).trim()) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    // DO NOT clear OTP here
    return res.json({
      success: true,
      message: "OTP verified. You can now reset your password.",
    });
  } catch (err) {
    console.error("VERIFY OTP ERROR:", err);
    return res.status(500).json({ message: "OTP verification failed" });
  }
};
