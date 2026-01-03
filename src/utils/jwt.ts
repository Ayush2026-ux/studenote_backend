import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET as string;

export const generateAccessToken = (payload: object) =>
    jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' });

export const generateRefreshToken = (payload: object) =>
    jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });

export const verifyToken = (token: string) =>
    jwt.verify(token, JWT_SECRET);
