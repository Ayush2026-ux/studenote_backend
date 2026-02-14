import { Request, Response } from "express";
import { triggerManualEarningsSettlement } from "../../../services/payments/earnings.scheduler";

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
 * Manual trigger for earnings settlement (ADMIN ONLY)
 */
export const manualSettleEarnings = async (req: AdminRequest, res: Response) => {
    if (!ensureAdmin(req, res)) return;

    try {
        console.log("[Admin] Manual earnings settlement triggered by:", req.user._id);

        const result = await triggerManualEarningsSettlement();

        return res.json({
            success: true,
            message: "Earnings settlement completed manually",
            result,
            warning: "Use manual settlement only for testing/emergencies",
        });
    } catch (error: any) {
        console.error("[Admin] Manual earnings settlement error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to settle earnings",
        });
    }
};
