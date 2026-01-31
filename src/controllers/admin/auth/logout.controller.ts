import { Request, Response } from "express";
import Session from "../../../models/users/session.model";

export const LogoutController = async (req: Request, res: Response) => {
    try {
        //  Tokens come from cookies now
        const refreshToken = req.cookies?.refreshToken;

        if (refreshToken) {
            // Optional but recommended: revoke session in DB
            await Session.updateOne(
                { token: refreshToken },
                { isRevoked: true }
            );
        }

        //  Clear cookies
        res.clearCookie("accessToken", {
            httpOnly: true,
            sameSite: "lax",
            secure: false, // true in prod
        });

        res.clearCookie("refreshToken", {
            httpOnly: true,
            sameSite: "lax",
            secure: false,
        });

        return res.status(200).json({
            success: true,
            message: "Logged out successfully",
        });
    } catch (error: any) {
        console.error("LOGOUT ERROR:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error during logout",
        });
    }
};
