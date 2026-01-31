import { Request, Response } from "express";
import mongoose from "mongoose";
import User from "../../models/users/users.models";
import Session from "../../models/users/session.model";
import LoginActivity from "../../models/users/loginActivity.model";
import {
  generateAccessToken,
  generateRefreshToken,
} from "../../utils/jwt";
import { sendLoginAlertEmail } from "../../utils/sendLoginAlertEmail";
import { getLocationFromIp } from "../../utils/getLocationFromIp";
import { getClientIp } from "../../utils/getClientIp"; // 🔥 ADD THIS

export const verifyOtpController = async (
  req: Request,
  res: Response
) => {
  try {
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
      "+otp +otpExpiry"
    );

    if (!user || !user.otp || !user.otpExpiry) {
      return res.status(400).json({
        success: false,
        message: "OTP expired or not requested",
      });
    }

    /* ================= OTP CHECK ================= */
    if (user.otpExpiry < new Date()) {
      user.otp = undefined;
      user.otpExpiry = undefined;
      await user.save();

      return res.status(400).json({
        success: false,
        message: "OTP has expired",
      });
    }

    if (String(user.otp).trim() !== String(otp).trim()) {
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

    /* ================= REAL IP ================= */
    const ipAddress = getClientIp(req); // 🔥 FIX
    user.lastLoginIp = ipAddress;

    /* ================= TOKENS ================= */
    const accessToken = generateAccessToken({
      userId: user._id.toString(),
    });

    const refreshToken = generateRefreshToken({
      userId: user._id.toString(),
    });

    await user.save();

    /* ================= DEVICE & LOCATION ================= */
    const userAgent = req.headers["user-agent"] || "unknown";
    const device =
      deviceName ||
      userAgent ||
      "Unknown device";

    const location = await getLocationFromIp(ipAddress);

    /* ================= SESSION CREATE ================= */
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

    /* ================= LOGIN ACTIVITY ================= */
    await LoginActivity.create({
      userId: user._id,
      ipAddress,
      device,
      userAgent,
    });

    /* ================= LOGIN ALERT ================= */
    if (user.loginAlertEnabled === true) {
      try {
        await sendLoginAlertEmail({
          to: user.email,
          device,
          ip: ipAddress,
          time: new Date(),
        });
      } catch (err) {
        console.error("LOGIN ALERT EMAIL FAILED:", err);
      }
    }

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
    console.error("VERIFY OTP ERROR:", error);
    return res.status(500).json({
      success: false,
      message:
        error?.message ||
        "Internal server error during OTP verification",
    });
  }
};
