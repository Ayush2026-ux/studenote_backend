import jwt from "jsonwebtoken";

export const generateAccessToken = (payload: object) => {
    if (!process.env.JWT_ACCESS_SECRET) {
        throw new Error("JWT_ACCESS_SECRET is missing");
    }

    return jwt.sign(payload, process.env.JWT_ACCESS_SECRET, {
        expiresIn: "15m",
    });
};

export const generateRefreshToken = (payload: object) => {
    if (!process.env.JWT_REFRESH_SECRET) {
        throw new Error("JWT_REFRESH_SECRET is missing");
    }

    return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
        expiresIn: "7d",
    });
};
