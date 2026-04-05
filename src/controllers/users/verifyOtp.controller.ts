import { Request, Response } from "express";
import mongoose from "mongoose";
import User from "../../models/users/users.models";
import Session from "../../models/users/session.model";
import LoginActivity from "../../models/users/loginActivity.model";

import {
  generateAccessToken,
  generateRefreshToken,
  generateAdminAccessToken,
  generateAdminRefreshToken,
} from "../../utils/jwt";

import { sendLoginAlertEmail } from "../../services/mail/loginAlert.mail";
import { getLocationFromIp } from "../../utils/getLocationFromIp";
import { getClientIp } from "../../utils/getClientIp";

export const verifyOtpController = async (req: Request, res: Response) => {
  try {
    console.log("🔐 VERIFY OTP REQUEST:", req.body);

    const { userId, otp, deviceName } = req.body;

    /* ================= VALIDATION ================= */

    if (!userId || !otp) {
      return res.status(400).json({
        success: false,
        message: "User ID and OTP are required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid User ID format",
      });
    }

    /* ================= FIND USER ================= */

    const user = await User.findById(userId).select(
      "+otp +otpExpiry +otpAttempts"
    );

    if (!user || !user.otp || !user.otpExpiry) {
      return res.status(400).json({
        success: false,
        message: "OTP expired or already used",
      });
    }

    /* ================= OTP ATTEMPT LIMIT ================= */

    if ((user.otpAttempts || 0) >= 5) {
      return res.status(429).json({
        success: false,
        message: "Too many OTP attempts. Request new OTP.",
      });
    }

    /* ================= OTP EXPIRY ================= */

    if (user.otpExpiry.getTime() < Date.now()) {
      console.log("❌ OTP EXPIRED:", user.email);

      user.otp = undefined;
      user.otpExpiry = undefined;
      await user.save();

      return res.status(400).json({
        success: false,
        message: "OTP has expired",
      });
    }

    /* ================= OTP MATCH ================= */

    if (String(user.otp).trim() !== String(otp).trim()) {
      user.otpAttempts = (user.otpAttempts || 0) + 1;
      await user.save();

      console.log("❌ INVALID OTP:", user.email);

      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    /* ================= CLEAR OTP ================= */

    user.otp = undefined;
    user.otpExpiry = undefined;
    user.otpAttempts = 0;
    user.isEmailVerified = true;
    user.lastLoginAt = new Date();

    /* ================= IP ADDRESS ================= */

    const ipAddress = getClientIp(req);
    user.lastLoginIp = ipAddress;

    /* ================= TOKENS ================= */

    const accessToken =
      user.role === "admin"
        ? generateAdminAccessToken({ userId: user._id.toString() })
        : generateAccessToken({ userId: user._id.toString() });

    const refreshToken =
      user.role === "admin"
        ? generateAdminRefreshToken({ userId: user._id.toString() })
        : generateRefreshToken({ userId: user._id.toString() });

    await user.save();

    /* ================= DEVICE INFO ================= */

    const userAgent = req.headers["user-agent"] || "unknown";
    const device = deviceName || userAgent || "Unknown device";

    /* ================= LOCATION SAFE ================= */

    let location = "Unknown";

    try {
      location = await getLocationFromIp(ipAddress);
    } catch (err) {
      console.error("⚠️ LOCATION FETCH FAILED:", err);
    }

    /* ================= SESSION SAVE ================= */

    try {
      await Session.create({
        userId: user._id,
        token: refreshToken,
        ipAddress,
        device,
        userAgent,
        location,
        lastActiveAt: new Date(),
        isRevoked: false,
      });
    } catch (err) {
      console.error("⚠️ SESSION SAVE FAILED:", err);
    }

    /* ================= LOGIN ACTIVITY ================= */

    try {
      await LoginActivity.create({
        userId: user._id,
        ipAddress,
        device,
        userAgent,
      });
    } catch (err) {
      console.error("⚠️ LOGIN ACTIVITY FAILED:", err);
    }

    /* ================= LOGIN ALERT ================= */

    if (user.loginAlertEnabled === true) {
      sendLoginAlertEmail({
        to: user.email,
        device,
        ip: ipAddress,
        time: new Date(),
      }).catch((err) =>
        console.error("⚠️ LOGIN ALERT EMAIL FAILED:", err)
      );
    }

    console.log("✅ OTP VERIFIED SUCCESS:", user.email);

    /* ================= RESPONSE ================= */

    return res.status(200).json({
      success: true,
      message: "OTP verified successfully",
      accessToken,
      refreshToken,
      user: {
        _id: user._id,
        fullName: user.fullName,
        username: user.username,
        email: user.email,
        mobile: user.mobile,
        role: user.role,
        avatar: user.avatar,
        isEmailVerified: user.isEmailVerified,
        isActive: user.isActive,
        lastLoginAt: user.lastLoginAt,
        lastLoginIp: user.lastLoginIp,
      },
    });

  } catch (error: any) {
    console.error("❌ VERIFY OTP ERROR:", error);

    return res.status(500).json({
      success: false,
      message:
        error?.message ||
        "Internal server error during OTP verification",
    });
  }
};