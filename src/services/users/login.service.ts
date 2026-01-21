import bcrypt from "bcryptjs";
import { generateAccessToken, generateRefreshToken } from "../../utils/jwt";
import User from "../../models/users/users.models";

export const loginUser = async (email: string, password: string) => {
  // 🔹 normalize email
  const normalizedEmail = email.toLowerCase().trim();

  // 🔹 fetch user with password
  const user = await User.findOne({ email: normalizedEmail }).select(
    "+password +isActive +provider"
  );

  // ❌ user not found
  if (!user) {
    throw new Error("Invalid email or password");
  }

  // ❌ google user trying password login
  if (user.provider === "google") {
    throw new Error("Please login using Google");
  }

  // ❌ inactive account
  if (!user.isActive) {
    throw new Error("Account is disabled");
  }

  // 🔐 password compare (MODEL HASHED IT)
  const isMatch = await bcrypt.compare(password, user.password as string);

  if (!isMatch) {
    throw new Error("Invalid email or password");
  }

  // 🔑 generate tokens
  const payload = { userId: user._id.toString() };

  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  // 💾 save refresh token in DB
  user.refreshToken = refreshToken;
  user.refreshTokenExpiry = new Date(
    Date.now() + 365 * 24 * 60 * 60 * 1000 // 1 year
  );

  await user.save();

  // ✅ final response
  return {
    accessToken,
    refreshToken,
    user: {
      id: user._id.toString(),
      username: user.username,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
    },
  };
};
