import jwt from 'jsonwebtoken';

export const authMiddleware = (req: any, res: any, next: any) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.sendStatus(401);

        req.user = jwt.verify(token, process.env.JWT_SECRET as string);
        next();
    } catch {
        return res.status(401).json({ code: 'TOKEN_EXPIRED' });
    }
};
