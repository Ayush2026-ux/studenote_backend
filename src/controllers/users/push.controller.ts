import { Request, Response } from "express";
import User from "../../models/users/users.models";

/* ======================================================
   SAVE / UPDATE EXPO PUSH TOKEN
====================================================== */

export const savePushToken = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const { token } = req.body;

        if (!token || typeof token !== "string") {
            return res.status(400).json({
                success: false,
                message: "Invalid push token",
            });
        }

        await User.updateOne(
            { _id: userId },
            { expoPushToken: token }
        );

        res.json({
            success: true,
            message: "Push token saved",
        });
    } catch (error) {
        console.error("SAVE_PUSH_TOKEN_ERROR:", error);
        res.status(500).json({
            success: false,
            message: "Unable to save push token",
        });
    }
};
