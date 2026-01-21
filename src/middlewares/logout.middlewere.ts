import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export const protect = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ message: "Not authorized" });
        }

        const token = authHeader.split(" ")[1];

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET as string
        ) as { _id: string };

        (req as any).user = decoded;

        next();
    } catch {
        return res.status(401).json({ message: "Token invalid or expired" });
    }
};
