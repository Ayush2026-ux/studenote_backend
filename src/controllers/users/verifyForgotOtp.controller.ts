import User from "../../models/users/users.models";
import { Request, Response } from "express";

export const verifyForgotOtp = async (req: Request, res: Response) => {
  try {
    const { email, otp } = req.body;

    const user = await User.findOne({ email }).select("+otp +otpExpiry");

    if (!user || !user.otp || !user.otpExpiry) {
      return res.status(400).json({ message: "OTP expired" });
    }

    if (user.otpExpiry < new Date()) {
      return res.status(400).json({ message: "OTP expired" });
    }

    if (user.otp !== otp.toString().trim()) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    // ✅ clear OTP
    user.otp = undefined;
    user.otpExpiry = undefined;
    await user.save();

    return res.json({
      success: true,
      message: "OTP verified",
    });
  } catch (err) {
    return res.status(500).json({ message: "OTP verification failed" });
  }
};
