import { Response } from "express";
import { AuthRequest } from "../../middlewares/auth.middleware";
import User from "../../models/users/users.models";
import { generateOtp } from "../../utils/generateOtp";
import { sendOtpMail } from "../../services/mail/otp.mail";

export const sendChangePasswordOtp = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const userId = (req.user as any)?.userId;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const otp = String(generateOtp());
    user.otp = otp;
    user.otpExpiry = new Date(Date.now() + 5 * 60 * 1000); // ⏱ 5 min
    await user.save();

    await sendOtpMail(user.email, otp);

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
