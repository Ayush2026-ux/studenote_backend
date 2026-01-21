import { Response } from "express";
import bcrypt from "bcryptjs";
import { AuthRequest } from "../../middlewares/auth.middleware";
import User from "../../models/users/users.models";

/**
 * CHANGE PASSWORD AFTER OTP VERIFICATION
 */
export const changePasswordAfterOtp = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    // ✅ FIX: use userId (not id)
    const userId = req.user?.userId;
    const { newPassword } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (!newPassword) {
      return res.status(400).json({
        success: false,
        message: "New password is required",
      });
    }

    const user = await User.findById(userId).select(
      "+isChangePasswordOtpVerified +password"
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (!user.isChangePasswordOtpVerified) {
      return res.status(403).json({
        success: false,
        message: "OTP verification required",
      });
    }

    // 🔐 HASH PASSWORD
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;

    // 🔁 Reset OTP verification flag
    user.isChangePasswordOtpVerified = false;

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error("CHANGE PASSWORD AFTER OTP ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to change password",
    });
  }
};
