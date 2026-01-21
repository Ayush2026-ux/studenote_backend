import { Request, Response } from "express";
import User from "../../models/users/users.models";

export const logoutAllDevices = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;

    // 🔥 Remove all refresh tokens / sessions
    await User.findByIdAndUpdate(userId, {
      refreshToken: null,
      refreshTokenExpiry: null,
    });

    return res.status(200).json({
      success: true,
      message: "Logged out from all devices",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to logout all devices",
    });
  }
};
