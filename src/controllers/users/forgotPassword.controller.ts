import User from "../../models/users/users.models";
import { generateOtp } from "../../utils/generateOtp";
import { sendOtpMail } from "../../services/mail/otp.mail";

export const forgotPassword = async (req: any, res: any) => {
  const { email } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  const otp = generateOtp();
  user.otp = otp;
  user.otpExpiry = new Date(Date.now() + 5 * 60 * 1000);
  await user.save();

  await sendOtpMail(email, otp);

  res.json({
    success: true,
    message: "OTP sent to email",
  });
};
