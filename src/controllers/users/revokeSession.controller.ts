import { Response } from "express";
import { AuthRequest } from "../../middlewares/auth.middleware";
import Session from "../../models/users/session.model";

export const revokeSession = async (
  req: AuthRequest,
  res: Response
) => {
  const userId = req.user!.userId; // 🔥 FIXED
  const { sessionId } = req.params;

  const session = await Session.findOne({
    _id: sessionId,
    userId,
    isRevoked: false,
  });

  if (!session) {
    return res.status(404).json({
      success: false,
      message: "Session not found",
    });
  }

  session.isRevoked = true;
  await session.save();

  return res.json({
    success: true,
    message: "Session revoked successfully",
  });
};
