import { Response } from "express";
import { AuthRequest } from "../../middlewares/auth.middleware";
import Session from "../../models/users/session.model";

export const getUserSessions = async (
  req: AuthRequest,
  res: Response
) => {
  const userId = (req.user as any).userId;

  const sessions = await Session.find({
    userId,
    isRevoked: false,
  }).sort({ lastActiveAt: -1 });

  res.json({ sessions });
};
