import jwt, { JwtPayload as DefaultJwtPayload } from "jsonwebtoken";

const ACCESS_SECRET = process.env.JWT_SECRET;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

if (!ACCESS_SECRET || !REFRESH_SECRET) {
  throw new Error(
    "❌ JWT secrets missing. Please set JWT_SECRET and JWT_REFRESH_SECRET in .env"
  );
}

export interface AppJwtPayload extends DefaultJwtPayload {
  userId: string;
  role?: "user" | "admin";
}

/* ================= USER TOKENS (45m / 365d) ================= */

export const generateAccessToken = (payload: AppJwtPayload): string =>
  jwt.sign(payload, ACCESS_SECRET, { expiresIn: "45m" });

export const generateRefreshToken = (payload: AppJwtPayload): string =>
  jwt.sign(payload, REFRESH_SECRET, { expiresIn: "365d" });

/* ================= ADMIN TOKENS (12h / 7d) ================= */

export const generateAdminAccessToken = (payload: AppJwtPayload): string =>
  jwt.sign({ ...payload, role: "admin" }, ACCESS_SECRET, { expiresIn: "12h" });

export const generateAdminRefreshToken = (payload: AppJwtPayload): string =>
  jwt.sign({ ...payload, role: "admin" }, REFRESH_SECRET, { expiresIn: "7d" });

/* ================= TOKEN VERIFICATION ================= */

export const verifyAccessToken = (token: string): AppJwtPayload =>
  jwt.verify(token, ACCESS_SECRET) as AppJwtPayload;

export const verifyRefreshToken = (token: string): AppJwtPayload =>
  jwt.verify(token, REFRESH_SECRET) as AppJwtPayload;
