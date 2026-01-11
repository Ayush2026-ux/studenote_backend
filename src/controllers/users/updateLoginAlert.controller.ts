import { Response } from "express";
import { AuthRequest } from "../../middlewares/auth.middleware";
import User from "../../models/users/users.models";

export const updateLoginAlert = async (
  req: AuthRequest,
  res: Response
) => {
  const userId = (req.user as any).userId;
  const { enabled } = req.body;

  const user = await User.findByIdAndUpdate(
    userId,
    { loginAlertEnabled: enabled },
    { new: true }
  );

  res.json({
    success: true,
    loginAlertEnabled: user?.loginAlertEnabled,
  });
};
