import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import User from "../../models/users/users.models";
import { googleClients } from "../../config/google";

type Platform = "web" | "android" | "ios";

export const googleLogin = async (req: Request, res: Response) => {
    try {
        const { idToken, platform } = req.body as {
            idToken: string;
            platform: Platform;
        };

        if (!idToken || !platform) {
            return res.status(400).json({
                success: false,
                message: "idToken and platform are required",
            });
        }

        const client = googleClients[platform];
        if (!client) {
            return res.status(400).json({
                success: false,
                message: "Invalid platform",
            });
        }

        //  Verify Google token
        const ticket = await client.verifyIdToken({
            idToken,
            audience: client._clientId,
        });

        const payload = ticket.getPayload();
        if (!payload || !payload.email) {
            return res.status(401).json({
                success: false,
                message: "Invalid Google token",
            });
        }

        const { email, name, picture } = payload;

        //  Find user ONLY by email
        let user = await User.findOne({ email });

        //  New Google user
        if (!user) {
            const dummyMobile =
                "9" + Math.floor(100000000 + Math.random() * 900000000);

            const dummyPassword = crypto.randomBytes(16).toString("hex");

            user = await User.create({
                fullName: name || "Google User",
                email,
                mobile: dummyMobile,
                password: dummyPassword,
                provider: "google",
                avatar: picture,
            });
            console.log("New Google user created:", user);
        } else {
            //  Existing user (local → google OR google again)
            user.provider = "google";
            if (!user.avatar && picture) {
                user.avatar = picture;
            }
            await user.save();
        }

        //  JWT
        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_ACCESS_SECRET as string,
            { expiresIn: "7d" }
        );

        return res.status(200).json({
            success: true,
            message: "Google login successful",
            token,
            user,
        });
    } catch (error) {
        console.error("Google Login Error:", error);
        return res.status(500).json({
            success: false,
            message: "Google authentication failed",
        });
    }
};