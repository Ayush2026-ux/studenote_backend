import { Request, Response } from "express";
import purchaseModel from "../../../models/payments/purchase.model";

interface AdminRequest extends Request {
    user: { _id: string; role: string };
}

const ensureAdmin = (req: AdminRequest, res: Response) => {
    if (req.user?.role !== "admin") {
        res.status(403).json({ message: "Admin access required" });
        return false;
    }
    return true;
};

/**
 * List all refunds (for admin visibility only)
 */
export const listRefunds = async (req: AdminRequest, res: Response) => {
    if (!ensureAdmin(req, res)) return;

    try {
        const refunds = await purchaseModel
            .find({ refundStatus: { $exists: true } })
            .sort({ refundRequestedAt: -1 })
            .populate("user", "fullName email")
            .populate("note", "title");

        return res.json({
            count: refunds.length,
            refunds,
            timestamp: new Date(),
        });
    } catch (error: any) {
        console.error("listRefunds error:", error);
        return res.status(500).json({ message: "Failed to fetch refunds" });
    }
};

/**
 * Get refund stats (read-only)
 */
export const getRefundStats = async (req: AdminRequest, res: Response) => {
    if (!ensureAdmin(req, res)) return;

    try {
        const stats = await purchaseModel.aggregate([
            {
                $match: { refundStatus: { $exists: true } },
            },
            {
                $group: {
                    _id: "$refundStatus",
                    count: { $sum: 1 },
                    totalAmount: { $sum: "$refundAmount" },
                },
            },
        ]);

        return res.json({
            stats,
            timestamp: new Date(),
        });
    } catch (error: any) {
        console.error("getRefundStats error:", error);
        return res.status(500).json({ message: "Failed to fetch refund stats" });
    }
};
