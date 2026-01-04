import { Request, Response } from "express";
import User from "../../models/users/users.models";
import { generateAccessToken } from "../../utils/jwt";


export const verifyOtpController = async (req: Request, res: Response) => {
  try {
    const { userId, otp } = req.body;

    const user = await User.findById(userId);

    if (!user || !user.otp || !user.otpExpiry) {
      return res.status(400).json({ message: "OTP expired" });
    }

    if (user.otp !== otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    if (user.otpExpiry < new Date()) {
      return res.status(400).json({ message: "OTP expired" });
    }

    // ✅ Clear OTP
    user.otp = undefined;
    user.otpExpiry = undefined;
    await user.save();

    // 🔐 Issue JWT AFTER OTP verification
    const accessToken = generateAccessToken({
      userId: user._id,
    });

    return res.status(200).json({
      success: true,
      message: "OTP verified successfully",
      accessToken,
      user: {
        id: user._id,
        email: user.email,
        fullName: user.fullName,
      },
    });
  } catch (error) {
    console.error("VERIFY OTP ERROR:", error);
    return res.status(500).json({ message: "OTP verification failed" });
  }
};
