// src/utils/jwt.ts
import jwt, { JwtPayload as DefaultJwtPayload } from "jsonwebtoken";

/* ================= ENV SECRETS ================= */

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

/* 🔒 HARD SAFETY CHECK (VERY IMPORTANT) */
if (!ACCESS_SECRET || !REFRESH_SECRET) {
  throw new Error(
    "❌ JWT secrets missing. Please set JWT_ACCESS_SECRET and JWT_REFRESH_SECRET in .env"
  );
}

/* ================= CUSTOM PAYLOAD ================= */

export interface AppJwtPayload extends DefaultJwtPayload {
  userId: string;
}

/* ================= GENERATE TOKENS ================= */

export const generateAccessToken = (payload: AppJwtPayload): string => {
  return jwt.sign(payload, ACCESS_SECRET, {
    expiresIn: "40m",
  });
};

export const generateRefreshToken = (payload: AppJwtPayload): string => {
  return jwt.sign(payload, REFRESH_SECRET, {
    expiresIn: "365d",
  });
};

/* ================= VERIFY TOKENS ================= */

export const verifyAccessToken = (token: string): AppJwtPayload => {
  return jwt.verify(token, ACCESS_SECRET) as AppJwtPayload;
};

export const verifyRefreshToken = (token: string): AppJwtPayload => {
  return jwt.verify(token, REFRESH_SECRET) as AppJwtPayload;
};
