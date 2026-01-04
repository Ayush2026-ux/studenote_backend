import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { generateAccessToken } from "../../utils/jwt";
import { loginUser } from "../../services/users/login.service";

export const login = async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required",
            });
        }

        const data = await loginUser(email, password);
        console.log(data);

        return res.status(200).json({
            success: true,
            message: "Login successful",
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
            user: data.user,
        });
    } catch (error: any) {
        return res.status(401).json({
            success: false,
            message: error.message || "Invalid credentials",
        });
    }
};

export const refreshAccessToken = (req: Request, res: Response) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(400).json({ message: "Refresh token required" });
        }

        const decoded = jwt.verify(
            refreshToken,
            process.env.JWT_REFRESH_SECRET as string
        ) as { userId: string };

        const newAccessToken = generateAccessToken({
            userId: decoded.userId,
        });

        res.json({ accessToken: newAccessToken });
    } catch {
        res.status(401).json({ message: "Refresh token expired. Login again." });
    }
};
