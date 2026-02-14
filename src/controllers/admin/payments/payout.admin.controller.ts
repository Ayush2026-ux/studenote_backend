import { Request, Response } from "express";
import payoutModel from "../../../models/payments/payout.model";
import {
    rejectPayout,
    markPayoutCompletedManually,
    approvePayoutManual,
} from "../../../services/payments/payout.service";
import User from "../../../models/users/users.models";

interface AdminRequest extends Request {
    user: { _id: string; role: "admin" };
}

const ensureAdmin = (req: AdminRequest, res: Response) => {
    if (req.user?.role !== "admin") {
        res.status(403).json({ message: "Admin access required" });
        return false;
    }
    return true;
};

/**
 * List all pending payout requests
 */
export const listPendingPayouts = async (req: AdminRequest, res: Response) => {
    if (!ensureAdmin(req, res)) return;

    try {
        const payouts = await payoutModel
            .find({ status: "requested" })
            .sort({ createdAt: -1 })
            .populate("user", "fullName email upiId bankAccountNumber bankIfsc city");

        res.json(payouts);
    } catch (err) {
        console.error("listPendingPayouts error:", err);
        res.status(500).json({ message: "Failed to fetch pending payouts" });
    }
};


/**
 * Approve payout (Admin verified details)
 * - Moves status to "approved"
 * - Sends "Approved" email to user
 */
export const approvePayout = async (req: AdminRequest, res: Response) => {
    if (!ensureAdmin(req, res)) return;

    const { payoutId } = req.params;

    try {
        const payout = await approvePayoutManual(payoutId, req.user._id);

        res.json({
            success: true,
            message: "Payout approved. You can now transfer funds manually.",
            payout,
        });
    } catch (error: any) {
        console.error("Approve payout error:", error);
        res.status(400).json({ message: error.message || "Failed to approve payout" });
    }
};

/**
 * Mark payout as COMPLETED (after admin manually transfers money)
 * - Updates payout status
 * - Updates wallet totalWithdrawn + lastPayoutAt
 * - Sends success email to user
 */
export const completePayout = async (req: AdminRequest, res: Response) => {
    if (!ensureAdmin(req, res)) return;

    const { payoutId } = req.params;

    try {
        const payout = await markPayoutCompletedManually(payoutId, req.user._id);

        res.json({
            success: true,
            message: "Payout marked as completed and user notified via email",
            payout,
        });
    } catch (error: any) {
        console.error("Complete payout error:", error);
        res.status(400).json({ message: error.message || "Failed to complete payout" });
    }
};

/**
 * Reject payout
 * - Refund wallet balance
 * - Save rejection reason
 * - Send rejection email
 */
export const rejectPayoutHandler = async (req: AdminRequest, res: Response) => {
    if (!ensureAdmin(req, res)) return;

    const { payoutId } = req.params;
    const { reason } = req.body;

    if (!reason) {
        return res.status(400).json({ message: "Rejection reason is required" });
    }

    try {
        const payout = await rejectPayout(payoutId, req.user._id, reason);

        res.json({
            success: true,
            message: "Payout rejected and wallet refunded",
            payout,
        });
    } catch (error: any) {
        console.error("Reject payout error:", error);
        res.status(400).json({ message: error.message || "Failed to reject payout" });
    }
};

export const updatePayoutDetails = async (req: Request, res: Response) => {
    try {
        const { payoutId } = req.params;

        const {
            upiId,
            upiAndAccountHolderName,
            bankAccountNumber,
            bankIfsc,
            city,
        } = req.body;

        const payout = await payoutModel.findByIdAndUpdate(
            payoutId,
            {
                upiId,
                upiAndAccountHolderName,
                bankAccountNumber,
                bankIfsc,
                city,
            },
            { new: true }
        );

        if (!payout) return res.status(404).json({ message: "Payout not found" });

        res.json(payout);
    } catch (err) {
        console.error("updatePayoutDetails error:", err);
        res.status(500).json({ message: "Failed to update payout" });
    }
};

