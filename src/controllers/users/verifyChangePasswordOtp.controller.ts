import { Response } from "express";
import crypto from "crypto";
import User from "../../models/users/users.models";
import { AuthRequest } from "../../middlewares/auth.middleware";

export const verifyChangePasswordOtp = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;   // ✅ FIX HERE
    const { otp } = req.body;

    if (!userId || !otp) {
      return res.status(400).json({ success: false, message: "OTP required" });
    }

    const user = await User.findById(userId).select(
      "+changePasswordOtp +changePasswordOtpExpiry +isChangePasswordOtpVerified"
    );

    if (!user || !user.changePasswordOtp || !user.changePasswordOtpExpiry) {
      return res.status(400).json({ success: false, message: "OTP expired" });
    }

    if (user.changePasswordOtpExpiry.getTime() < Date.now()) {
      user.changePasswordOtp = undefined;
      user.changePasswordOtpExpiry = undefined;
      await user.save();
      return res.status(400).json({ success: false, message: "OTP expired" });
    }

    const incomingHash = crypto
      .createHash("sha256")
      .update(String(otp).trim())
      .digest("hex");

    if (incomingHash !== user.changePasswordOtp) {
      return res.status(400).json({ success: false, message: "Invalid OTP" });
    }

    user.isChangePasswordOtpVerified = true;
    await user.save();

    return res.json({ success: true, message: "OTP verified" });
  } catch (err) {
    console.error("VERIFY CHANGE PASSWORD OTP ERROR:", err);
    return res.status(500).json({ success: false, message: "OTP verification failed" });
  }
};
