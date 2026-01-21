import { Response } from "express";
import { AuthRequest } from "../../middlewares/auth.middleware";
import Session from "../../models/users/session.model";

export const getUserSessions = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const userId = req.user.userId;
    const currentRefreshToken = req.user.refreshToken;

    const sessions = await Session.find({
      userId,
      isRevoked: false,
    }).sort({ lastActiveAt: -1 });

    const formattedSessions = sessions.map((s) => ({
      _id: s._id,
      ip: s.ipAddress || "—",
      userAgent: s.userAgent || "Unknown",
      device: s.device || "Unknown",
      location: s.location || "Unknown", // 🌍 FIXED
      lastActiveAt: s.lastActiveAt,
      isCurrent: s.token === currentRefreshToken, // ✅ CURRENT DEVICE
    }));

    return res.json({
      success: true,
      sessions: formattedSessions,
    });
  } catch (error) {
    console.error("GET USER SESSIONS ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch sessions",
    });
  }
};
