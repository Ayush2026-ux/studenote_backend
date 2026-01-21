import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import User from "../models/users/users.models";

/* ================= TYPES ================= */

export interface AuthRequest extends Request {
  user?: any; // same behavior as your last working version
}

/* ================= AUTH GUARD ================= */

export const authGuard = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    /* ================= AUTH HEADER ================= */
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authorization token missing",
      });
    }

    const accessToken = authHeader.split(" ")[1];

    /* ================= VERIFY ACCESS TOKEN ================= */
    const decoded = jwt.verify(
      accessToken,
      process.env.JWT_SECRET!
    ) as JwtPayload & { _id?: string };

    if (!decoded || !decoded._id) {
      return res.status(401).json({
        success: false,
        message: "Invalid access token payload",
      });
    }

    /* ================= USER CHECK ================= */
    const user = await User.findById(decoded._id).select("-password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "Account is disabled",
      });
    }

    /* ================= ATTACH USER ================= */
    req.user = user;

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired access token",
    });
  }
};
