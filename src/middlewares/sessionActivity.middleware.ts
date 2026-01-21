import { Response, NextFunction } from "express";
import Session from "../models/users/session.model";
import { AuthRequest } from "./auth.middleware";

/**
 * 🔁 Update lastActiveAt for current session
 */
export const updateSessionActivity = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const refreshToken = req.user?.refreshToken;

    // Agar refresh token nahi hai, skip
    if (!refreshToken) {
      return next();
    }

    await Session.updateOne(
      {
        token: refreshToken,
        isRevoked: false,
      },
      {
        $set: {
          lastActiveAt: new Date(),
        },
      }
    );

    next();
  } catch (err) {
    // Activity update failure should NEVER block request
    console.error("SESSION ACTIVITY UPDATE ERROR:", err);
    next();
  }
};
