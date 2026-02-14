import { Response } from "express";
import { AuthRequest } from "../../middlewares/auth.middleware";
import { logoutUser } from "../../services/users/logout.service";

export const logout = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?._id;   // FIXED

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }

        await logoutUser(userId.toString());

        return res.status(200).json({
            success: true,
            message: "Logout successful",
        });
    } catch (error: any) {
        console.error("LOGOUT ERROR:", error);
        return res.status(400).json({
            success: false,
            message: error.message || "Logout failed",
        });
    }
};
