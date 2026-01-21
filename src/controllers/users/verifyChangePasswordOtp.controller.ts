import { Request, Response } from "express";
import crypto from "crypto";
import User from "../../models/users/users.models";

export const verifyChangePasswordOtp = async (
  req: Request,
  res: Response
) => {
  try {
    const userId = (req as Request & { user?: { id: string } }).user?.id;
    const { otp } = req.body;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!otp) {
      return res.status(400).json({ message: "OTP is required" });
    }

    const user = await User.findById(userId).select(
      "+changePasswordOtp +changePasswordOtpExpiry"
    );

    if (!user || !user.changePasswordOtp) {
      return res.status(400).json({ message: "OTP not found" });
    }

    const otpHash = crypto
      .createHash("sha256")
      .update(String(otp))
      .digest("hex");

    if (otpHash !== user.changePasswordOtp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    if (
      !user.changePasswordOtpExpiry ||
      user.changePasswordOtpExpiry.getTime() < Date.now()
    ) {
      return res.status(400).json({ message: "OTP expired" });
    }

    user.isChangePasswordOtpVerified = true;
    user.changePasswordOtp = undefined;
    user.changePasswordOtpExpiry = undefined;

    await user.save();

    return res.status(200).json({
      success: true,
      message: "OTP verified successfully",
    });
  } catch (error) {
    console.error("VERIFY CHANGE PASSWORD OTP ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "OTP verification failed",
    });
  }
};
