import { Request, Response, NextFunction } from "express";
import purchaseModel from "../models/payments/purchase.model";

// Rate limiting for payment operations
const requestLimits = new Map<string, { count: number; timestamp: number }>();
const RATE_LIMIT = 5; // requests per minute
const TIME_WINDOW = 60000; // 1 minute

export const paymentRateLimit = (req: Request, res: Response, next: NextFunction) => {
    const key = `payment_${(req as any).user?._id || req.ip}`;
    const now = Date.now();
    const userData = requestLimits.get(key);

    if (userData && now - userData.timestamp < TIME_WINDOW) {
        userData.count++;
        if (userData.count > RATE_LIMIT) {
            return res.status(429).json({
                message: "Too many payment requests. Please try again later.",
            });
        }
    } else {
        requestLimits.set(key, { count: 1, timestamp: now });
    }

    next();
};

// Validate purchase ownership
export const validatePurchaseOwnership = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const { purchaseId } = req.params || req.body;
        const userId = (req as any).user?._id;

        if (!purchaseId || !userId) {
            return res.status(400).json({ message: "Invalid request" });
        }

        const purchase = await purchaseModel.findById(purchaseId);

        if (!purchase) {
            return res.status(404).json({ message: "Purchase not found" });
        }

        if (purchase.user.toString() !== userId.toString()) {
            return res.status(403).json({ message: "Unauthorized" });
        }

        (req as any).purchase = purchase;
        next();
    } catch (error) {
        res.status(500).json({ message: "Validation failed" });
    }
};

// Validate refund request payload
export const validateRefundPayload = (req: Request, res: Response, next: NextFunction) => {
    const { purchaseId, reason } = req.body;

    if (!purchaseId || !reason) {
        return res.status(400).json({
            message: "purchaseId and reason are required",
        });
    }

    if (typeof reason !== "string" || reason.length < 10) {
        return res.status(400).json({
            message: "Reason must be at least 10 characters long",
        });
    }

    if (req.body.refundAmount && typeof req.body.refundAmount !== "number") {
        return res.status(400).json({
            message: "refundAmount must be a number",
        });
    }

    next();
};

// Log payment operations for audit trail
export const paymentAuditLog = async (req: Request, res: Response, next: NextFunction) => {
    const originalJson = res.json;

    res.json = function (data: any) {
        const logEntry = {
            timestamp: new Date(),
            userId: (req as any).user?._id,
            method: req.method,
            path: req.path,
            statusCode: res.statusCode,
            data: {
                purchaseId: req.body?.purchaseId || req.params?.purchaseId,
                operation: req.path.split("/").pop(),
            },
        };

        console.log("Payment Audit:", JSON.stringify(logEntry));

        return originalJson.call(this, data);
    };

    next();
};
