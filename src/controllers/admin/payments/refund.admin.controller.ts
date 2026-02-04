import { Request, Response } from "express";
import {
    getRefundProcessingStats,
    getRefundsNearCompletion,
    autoProcessRefunds,
} from "../../../services/payments/refund.service";
import {
    triggerManualRefundProcessing,
    getRefundSchedulerStatus,
} from "../../../services/payments/refund.scheduler";

interface AdminRequest extends Request {
    user: { _id: string; role: string };
}

/**
 * Get refund processing statistics for admin dashboard
 */
export const getRefundStats = async (req: AdminRequest, res: Response) => {
    try {
        const stats = await getRefundProcessingStats();
        res.json(stats);
    } catch (error: any) {
        console.error("Get refund stats error:", error);
        res.status(500).json({ message: error.message || "Failed to get refund statistics" });
    }
};

/**
 * Get refunds near completion for admin notifications
 */
export const getNearCompletionRefunds = async (req: AdminRequest, res: Response) => {
    try {
        const refunds = await getRefundsNearCompletion();
        res.json({
            count: refunds.length,
            refunds,
            timestamp: new Date(),
        });
    } catch (error: any) {
        console.error("Get near completion refunds error:", error);
        res.status(500).json({
            message: error.message || "Failed to get near completion refunds",
        });
    }
};

/**
 * Manually trigger refund processing
 * Useful for testing or immediate processing needs
 */
export const manualRefundProcessing = async (req: AdminRequest, res: Response) => {
    try {
        const result = await triggerManualRefundProcessing();
        res.json({
            message: "Manual refund processing triggered",
            result,
        });
    } catch (error: any) {
        console.error("Manual refund processing error:", error);
        res.status(500).json({
            message: error.message || "Failed to process refunds",
        });
    }
};

/**
 * Get scheduler status
 */
export const getSchedulerStatus = async (req: AdminRequest, res: Response) => {
    try {
        const status = getRefundSchedulerStatus();
        res.json(status);
    } catch (error: any) {
        console.error("Get scheduler status error:", error);
        res.status(500).json({ message: error.message || "Failed to get scheduler status" });
    }
};

/**
 * Immediate refund processing endpoint
 * For emergency/urgent refunds
 */
export const forceRefundProcessing = async (req: AdminRequest, res: Response) => {
    try {
        const { purchaseId } = req.body;

        if (!purchaseId) {
            return res.status(400).json({ message: "purchaseId is required" });
        }

        const result = await autoProcessRefunds();

        res.json({
            message: "Force refund processing completed",
            result,
        });
    } catch (error: any) {
        console.error("Force refund processing error:", error);
        res.status(500).json({ message: error.message || "Failed to force refund processing" });
    }
};
