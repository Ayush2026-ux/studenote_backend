import { Request, Response, NextFunction } from "express";

export const adminAuth = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // example: JWT se admin check
  
    const isAdmin = req.headers["x-admin-auth"] === "true"; // Simplified check 
    if (!isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }
    

  next();
};
