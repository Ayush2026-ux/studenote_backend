import { Request, Response } from "express";
import { logoutUser } from "../../services/users/logout.service";

export const logout = async (req: Request, res: Response) => {
    try {
        // userId should come from auth middleware
        const userId = (req as any).user.userId;

        await logoutUser(userId);

        return res.status(200).json({
            success: true,
            message: "Logout successful",
        });
    } catch (error: any) {
        return res.status(400).json({
            success: false,
            message: error.message || "Logout failed",
        });
    }
};
