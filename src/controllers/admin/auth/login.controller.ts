import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import User from "../../../models/users/users.models";
import { generateOtp } from "../../../utils/generateOtp";
import { sendOtpMail } from "../../../services/mail/otp.mail";

export const adminLogin = async (req: Request, res: Response) => {
    try {
        const body = req.body || {};

        const email =
            typeof body.email === "string" ? body.email.toLowerCase().trim() : "";

        const password = typeof body.password === "string" ? body.password : "";

        const adminSecretInput =
            typeof body.adminSecret === "string" ? body.adminSecret : "";

        /* BASIC VALIDATION */
        if (!email || !password || !adminSecretInput) {
            return res.status(400).json({
                success: false,
                message: "Email, password and admin secret are required",
            });
        }

        /* FIND ADMIN USER */
        const admin = await User.findOne({ email, role: "admin" }).select(
            "+password +adminSecret"
        );

        if (!admin) {
            return res.status(404).json({
                success: false,
                message: "Admin not found",
            });
        }

        /* GOOGLE USER SAFETY */
        if (!admin.password) {
            return res.status(400).json({
                success: false,
                message: "Please login using Google",
            });
        }

        /* PASSWORD CHECK */
        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: "Invalid credentials",
            });
        }

        /* ADMIN SECRET CHECK (TEMP PLAINTEXT) */
        if (admin.adminSecret !== adminSecretInput) {
            return res.status(401).json({
                success: false,
                message: "Invalid admin secret",
            });
        }

        /* ACCOUNT STATUS */
        if (!admin.isActive) {
            return res.status(403).json({
                success: false,
                message: "Admin account is disabled",
            });
        }

        /* UPDATE LAST LOGIN */
        admin.lastLoginAt = new Date();
        admin.lastLoginIp = req.ip || "";

        /* GENERATE OTP */
        const otp = String(generateOtp());

        admin.otp = otp;
        admin.otpExpiry = new Date(Date.now() + 5 * 60 * 1000);
        admin.otpAttempts = 0;
        admin.lastOtpSentAt = new Date();

        await admin.save();

        res.status(200).json({
            success: true,
            message: "OTP sent to your email",
            userId: admin._id,
            email: admin.email,
        });

        sendOtpMail(email, otp).catch((err) => {
            console.error("OTP MAIL ERROR:", err);
        });
    } catch (error: any) {
        console.error("ADMIN LOGIN CONTROLLER ERROR:", error);

        return res.status(500).json({
            success: false,
            message: error?.message || "Admin login failed",
        });
    }
};