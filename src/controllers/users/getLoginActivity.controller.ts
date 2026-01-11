import { Response } from "express";
import { AuthRequest } from "../../middlewares/auth.middleware";
import LoginActivity from "../../models/users/loginActivity.model";

export const getLoginActivity = async (
  req: AuthRequest,
  res: Response
) => {
  const userId = (req.user as any).userId;

  const activity = await LoginActivity.find({ userId })
    .sort({ createdAt: -1 })
    .limit(20);

  res.json({ activity });
};
