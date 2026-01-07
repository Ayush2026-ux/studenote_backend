import { Response } from "express";
import bcrypt from "bcryptjs";
import { AuthRequest } from "../../middlewares/auth.middleware";
import User from "../../models/users/users.models";

export const changePasswordController = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const userId = (req.user as any)?.userId;
    const { otp, newPassword } = req.body;

    if (!otp || !newPassword) {
      return res.status(400).json({
        message: "OTP and new password required",
      });
    }

    const user = await User.findById(userId);
    if (!user || !user.otp || !user.otpExpiry) {
      return res.status(400).json({ message: "OTP expired" });
    }

    if (user.otp !== String(otp)) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    if (user.otpExpiry < new Date()) {
      return res.status(400).json({ message: "OTP expired" });
    }

    // 🔐 Hash password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;

    // ✅ Clear OTP
    user.otp = undefined;
    user.otpExpiry = undefined;

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Password updated successfully",
    });
  } catch (error) {
    console.error("CHANGE PASSWORD ERROR:", error);
    return res.status(500).json({
      message: "Failed to update password",
    });
  }
};
