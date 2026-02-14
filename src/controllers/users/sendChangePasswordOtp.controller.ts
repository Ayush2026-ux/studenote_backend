import { Response } from "express";
import crypto from "crypto";
import { AuthRequest } from "../../middlewares/auth.middleware";
import User from "../../models/users/users.models";
import { sendChangePasswordOtpMail } from "../../services/mail/otp.mail";

export const sendChangePasswordOtp = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;   // ✅ FIX HERE

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = crypto.createHash("sha256").update(otp).digest("hex");

    user.changePasswordOtp = otpHash;
    user.changePasswordOtpExpiry = new Date(Date.now() + 10 * 60 * 1000);
    user.isChangePasswordOtpVerified = false;

    await user.save();
    await sendChangePasswordOtpMail(user.email.toLowerCase(), otp);

    return res.status(200).json({
      success: true,
      message: "OTP sent to your email",
    });
  } catch (error) {
    console.error("SEND CHANGE PASSWORD OTP ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to send OTP",
    });
  }
};
