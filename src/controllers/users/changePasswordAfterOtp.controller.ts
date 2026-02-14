import bcrypt from "bcryptjs";
import { Response } from "express";
import User from "../../models/users/users.models";
import { AuthRequest } from "../../middlewares/auth.middleware";

export const changePasswordAfterOtp = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;   //correct source
    const { newPassword } = req.body;

    if (!userId || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "New password is required",
      });
    }

    const user = await User.findById(userId).select(
      "+changePasswordOtp +changePasswordOtpExpiry +isChangePasswordOtpVerified +password"
    );

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (!user.isChangePasswordOtpVerified) {
      return res.status(400).json({
        success: false,
        message: "OTP not verified",
      });
    }

    // Optional: strong password check on backend
    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters long",
      });
    }

    user.password = newPassword;  // pre-save hook will hash it

    // Clear OTP state
    user.changePasswordOtp = undefined;
    user.changePasswordOtpExpiry = undefined;
    user.isChangePasswordOtpVerified = false;

    await user.save();

    return res.json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error("CHANGE PASSWORD ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to change password",
    });
  }
};
