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
}

export const generateAccessToken = (payload: AppJwtPayload): string =>
  jwt.sign(payload, ACCESS_SECRET, { expiresIn: "40m" });

export const generateRefreshToken = (payload: AppJwtPayload): string =>
  jwt.sign(payload, REFRESH_SECRET, { expiresIn: "365d" });

export const verifyAccessToken = (token: string): AppJwtPayload =>
  jwt.verify(token, ACCESS_SECRET) as AppJwtPayload;

export const verifyRefreshToken = (token: string): AppJwtPayload =>
  jwt.verify(token, REFRESH_SECRET) as AppJwtPayload;
