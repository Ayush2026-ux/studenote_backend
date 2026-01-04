import User from "../../models/users/users.models";

export const verifyForgotOtp = async (req: any, res: any) => {
  const { email, otp } = req.body;

  const user = await User.findOne({ email });

  // ❌ user / otp missing
  if (!user || !user.otp || !user.otpExpiry) {
    return res.status(400).json({ message: "OTP expired" });
  }

  // ❌ expiry check FIRST
  if (user.otpExpiry < new Date()) {
    return res.status(400).json({ message: "OTP expired" });
  }

  // 🔥 STRING + TRIM comparison (MAIN FIX)
  if (user.otp !== otp.toString().trim()) {
    console.log("DB OTP:", user.otp);
    console.log("REQ OTP:", otp);
    return res.status(400).json({ message: "Invalid OTP" });
  }

  // ✅ clear otp after success (IMPORTANT)
  user.otp = undefined;
  user.otpExpiry = undefined;
  await user.save();

  return res.json({
    success: true,
    message: "OTP verified",
  });
};
