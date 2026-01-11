import { Response } from "express";
import { AuthRequest } from "../../middlewares/auth.middleware";
import LoginActivity from "../../models/users/loginActivity.model";

export const clearLoginActivity = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const userId = (req.user as any).userId;

    await LoginActivity.deleteMany({ userId });

    return res.json({
      success: true,
      message: "Login activity cleared successfully",
    });
  } catch (error) {
    console.error("CLEAR LOGIN ACTIVITY ERROR:", error);
    return res.status(500).json({
      message: "Failed to clear login activity",
    });
  }
};
