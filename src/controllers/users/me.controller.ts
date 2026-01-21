import { Response } from "express";
import { AuthRequest } from "../../middlewares/auth.middleware";
import User from "../../models/users/users.models";

export const getMeController = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    // ✅ SUPPORT BOTH CASES (future-proof)
    const userId =
      (req.user as any)?.userId ||
      (req.user as any)?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const user = await User.findById(userId).select(
      "-password -otp -otpExpiry -otpAttempts -lastOtpSentAt"
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("GET ME ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch user",
    });
  }
};
