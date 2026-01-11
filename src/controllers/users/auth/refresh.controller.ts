import Session from "../../../models/users/session.model";
import User from "../../../models/users/users.models";
import { Request, Response } from "express";
import jwt from "jsonwebtoken";

export const refreshTokenController = async (req: Request, res: Response) => {
  try {
    console.log("REFRESH BODY:", req.body);

    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: "Refresh token missing",
      });
    }

    const decoded: any = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET!
    );

    // ✅ FIX: SUPPORT BOTH userId AND _id
    const userId = decoded.userId || decoded._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Invalid refresh token payload",
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    const session = await Session.findOne({
      userId: user._id,
      token: refreshToken,
      isRevoked: false,
    });

    if (!session) {
      return res.status(401).json({
        success: false,
        message: "Session expired or revoked",
      });
    }

    const newAccessToken = jwt.sign(
      { _id: user._id },
      process.env.JWT_ACCESS_SECRET!,
      { expiresIn: "40m" }
    );

    const newRefreshToken = jwt.sign(
      { _id: user._id },
      process.env.JWT_REFRESH_SECRET!,
      { expiresIn: "365d" }
    );

    session.token = newRefreshToken;
    session.lastActiveAt = new Date();
    await session.save();

    return res.status(200).json({
      success: true,
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error: any) {
    console.error("REFRESH TOKEN ERROR:", error.message);
    return res.status(401).json({
      success: false,
      message: "Invalid or expired refresh token",
    });
  }
};
