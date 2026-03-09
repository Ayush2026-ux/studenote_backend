import { Response } from "express";
import User from "../../models/users/users.models";
import { AuthRequest } from "../../middlewares/auth.middleware";

export const updateProfile = async (
  req: AuthRequest,
  res: Response
) => {
  try {

    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const { fullName, username, mobile, avatar } = req.body;

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        ...(fullName && { fullName }),
        ...(username && { username }),
        ...(mobile && { mobile }),
        ...(avatar && { avatar }),
      },
      {
        new: true,
        runValidators: true,
      }
    ).select("-password -otp -otpExpiry");

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user: updatedUser,
    });

  } catch (err) {
    console.error("UPDATE PROFILE ERROR:", err);

    return res.status(500).json({
      success: false,
      message: "Profile update failed",
    });
  }
};
