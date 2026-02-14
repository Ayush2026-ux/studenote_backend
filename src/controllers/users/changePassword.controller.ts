import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import User from "../../models/users/users.models";

export const resetPasswordController = async (req: Request, res: Response) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res
        .status(400)
        .json({ message: "Email, OTP and new password required" });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() }).select("+otp +otpExpiry");

    if (!user || !user.otp || !user.otpExpiry) {
      return res.status(400).json({ message: "OTP expired or invalid" });
    }

    if (String(user.otp) !== String(otp)) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    if (user.otpExpiry.getTime() < Date.now()) {
      return res.status(400).json({ message: "OTP expired" });
    }

    user.password = newPassword;     // ✅ plain password
    user.otp = undefined;
    user.otpExpiry = undefined;

    await user.save();               // ✅ schema hashes it once

    res.json({ success: true, message: "Password reset successful" });
  } catch (err) {
    console.error("RESET PASSWORD ERROR:", err);
    res.status(500).json({ message: "Failed to reset password" });
  }
};
