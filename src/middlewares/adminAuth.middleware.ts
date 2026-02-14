import { Request, Response, NextFunction } from "express";
import User from "../models/users/users.models";
import { verifyAccessToken } from "../utils/jwt";

export interface AuthRequest extends Request {
  user?: any;
}

export const adminAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // console.log(" Admin Auth Check - Headers:", {
    //   "X-Debug-Admin": req.headers["x-debug-admin"],
    //   "NODE_ENV": process.env.NODE_ENV,
    //   "Authorization": req.headers.authorization ? "present" : "missing",
    // });

    // 🔧 DEBUG MODE - Skip auth if X-Debug-Admin header is set (development only)
    if (process.env.NODE_ENV !== "production" && req.headers["x-debug-admin"] === "true") {
      // console.warn("DEBUG MODE: Bypassing admin auth - use only in development!");
      // Create a dummy admin user for testing
      req.user = {
        _id: "debug-admin-id",
        fullName: "Debug Admin",
        email: "debug@example.com",
        role: "admin",
        isActive: true,
      };
      return next();
    }

    // Get authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("No Bearer token found");
      return res.status(401).json({
        success: false,
        message: "Authorization token missing",
      });
    }

    const accessToken = authHeader.split(" ")[1];
    console.log("Token received (first 20 chars):", accessToken.substring(0, 20) + "...");

    // Verify JWT token using the utility function
    let decoded: any;
    try {
      decoded = verifyAccessToken(accessToken);
      console.log(" Token verified successfully. User ID:", decoded.userId);
    } catch (jwtError: any) {
      console.log("Token verification failed:", jwtError.message);
      return res.status(401).json({
        success: false,
        message: jwtError.name === "TokenExpiredError" ? "Token expired" : "Invalid token",
      });
    }

    if (!decoded || !decoded.userId) {
      console.log("Invalid token payload");
      return res.status(401).json({
        success: false,
        message: "Invalid access token payload",
      });
    }

    // Get user from database
    const user = await User.findById(decoded.userId);

    if (!user) {
      console.log("User not found:", decoded.userId);
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    // Check if user has admin role
    if (user.role !== "admin") {
      console.log("User is not admin. Role:", user.role);
      return res.status(403).json({
        success: false,
        message: "Admin access required",
      });
    }

    // Check if admin account is active
    if (!user.isActive) {
      console.log("Admin account is inactive");
      return res.status(403).json({
        success: false,
        message: "Admin account is disabled",
      });
    }

    // console.log("Admin authenticated:", user.email);
    // Attach user to request
    req.user = user;
    next();
  } catch (error: any) {
    console.error("ADMIN AUTH ERROR:", error);
    return res.status(401).json({
      success: false,
      message: "Authentication failed",
    });
  }
};
