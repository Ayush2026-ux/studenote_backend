import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { generateAccessToken } from '../../utils/jwt';
import { loginUser } from '../../services/users/login.service';

export const login = async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;

        // 1️ Basic validation
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required'
            });
        }

        // 2️ Call service (Prisma + JWT)
        const data = await loginUser(email, password);

        // 3️ Success response (mobile-friendly)
        return res.status(200).json({
            success: true,
            message: 'Login successful',
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
            user: data.user
        });
    } catch (error: any) {
        return res.status(401).json({
            success: false,
            message: error.message || 'Invalid credentials'
        });
    }
};


export const refreshAccessToken = (req: Request, res: Response) => {
    try {
        const { refreshToken } = req.body;

        const decoded = jwt.verify(
            refreshToken,
            process.env.JWT_SECRET as string
        ) as any;

        const newAccessToken = generateAccessToken({
            userId: decoded.userId
        });

        res.json({ accessToken: newAccessToken });
    } catch {
        res.status(401).json({ message: 'Refresh token expired. Login again.' });
    }
};