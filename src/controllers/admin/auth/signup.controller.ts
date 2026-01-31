import { Request, Response } from "express";
import { registerSchema } from "../../../validators/register.validator";
import User from "../../../models/users/users.models";
import { sendWelcomeMail } from "../../../services/mail/welcome.mail";


export const adminSignupController = async (req: Request, res: Response) => {
    try {
        // 0 Safety check - ensure body exists
        if (!req.body || Object.keys(req.body).length === 0) {
            return res.status(400).json({
                success: false,
                message: "Request body is empty. Please provide required fields: username, fullName, email, mobile, password",
            });
        }

        // 1 Validate request body using Zod
        const validatedData = registerSchema.parse(req.body);

        // 2 Check if user already exists
        const existingUser = await User.findOne({
            $or: [{ email: validatedData.email }, { username: validatedData.username }],
        });

        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: "Email or username already exists",
            });
        }

        // 3 Create admin user
        const admin = await User.create({
            username: validatedData.username,
            fullName: validatedData.fullName,
            email: validatedData.email.toLowerCase().trim(),
            mobile: validatedData.mobile,
            password: validatedData.password, // Will be hashed by schema pre-save hook
            provider: "local",
            role: "admin", //  SET ROLE AS ADMIN
            isEmailVerified: true, // Auto-verify admin email
            isActive: true,
        });

        // 4 Send welcome email (NON-BLOCKING)
        sendWelcomeMail(admin.email, admin.fullName).catch((err) => {
            console.error("WELCOME MAIL ERROR:", err);
        });

        // 5 Send success response
        return res.status(201).json({
            success: true,
            message: "Admin registered successfully",
            admin: {
                id: admin._id,
                username: admin.username,
                fullName: admin.fullName,
                email: admin.email,
                mobile: admin.mobile,
                role: admin.role,
            },
        });
    } catch (error: any) {
        console.error("ADMIN SIGNUP CONTROLLER ERROR:", error);

        // Handle Zod validation errors
        if (error?.errors && Array.isArray(error.errors)) {
            const validationErrors = error.errors.map((err: any) => ({
                field: err.path?.[0] || "unknown",
                message: err.message,
            }));
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors: validationErrors,
            });
        }

        // Handle duplicate key error
        if (error.code === 11000) {
            const field = Object.keys(error.keyValue)[0];
            return res.status(409).json({
                success: false,
                message: `${field} already exists`,
            });
        }

        return res.status(400).json({
            success: false,
            message:
                error?.message ||
                "Admin registration failed",
        });
    }
};
