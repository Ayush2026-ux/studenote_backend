import bcrypt from "bcryptjs";
import User from "../../models/users/users.models";

export const resetPassword = async (req: any, res: any) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  user.password = hashedPassword;
  user.otp = undefined;
  user.otpExpiry = undefined;

  await user.save();

  res.json({
    success: true,
    message: "Password updated successfully",
  });
};
