import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import User from "../models/users/users.models";

export interface AuthRequest extends Request {
  user?: any;
}

export const authGuard = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authorization token missing",
      });
    }

    const accessToken = authHeader.split(" ")[1];

    //  Expect userId (not _id)
    const decoded = jwt.verify(
      accessToken,
      process.env.JWT_SECRET!
    ) as JwtPayload & { userId?: string };

    if (!decoded || !decoded.userId) {
      return res.status(401).json({
        success: false,
        message: "Invalid access token payload",
      });
    }

    const user = await User.findById(decoded.userId).select("-password");

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

    req.user = user;
    next();
  } catch (error) {
    console.error("AUTH GUARD ERROR:", error);
    return res.status(401).json({
      success: false,
      message: "Invalid or expired access token",
    });
  }
};
