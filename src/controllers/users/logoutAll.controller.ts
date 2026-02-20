import { Request, Response } from "express";
import User from "../../models/users/users.models";

interface AuthRequest extends Request {
  user?: { _id: string };
}

export const logoutAllDevices = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: User not logged in",
      });
    }

    //Remove all refresh tokens / sessions
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
