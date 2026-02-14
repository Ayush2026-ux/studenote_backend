import { Request, Response } from "express";
import NotesUpload from "../../models/users/NotesUpload";
import purchaseModel from "../../models/payments/purchase.model";
import feedModels from "../../models/users/feed.models";
import { calculateAmount } from "../../services/payments/razorpay.service";
import { creditCreatorWallet, releaseEarningImmediately, reverseEarningOnRefund } from "../../services/payments/wallet.service";

/**
 * payment.captured
 */
export const handlePaymentCaptured = async (req: Request, res: Response) => {
    try {
        const payment = req.body?.payload?.payment?.entity;
        if (!payment) return res.json({ received: true });

        const razorpayOrderId = payment.order_id;
        const razorpayPaymentId = payment.id;
        const paidAmount = (payment.amount || 0) / 100;

        const { noteId, userId } = payment.notes || {};

        if (!noteId || !userId || !razorpayOrderId) {
            console.warn(" Missing metadata in webhook");
            return res.json({ received: true });
        }

        const purchase = await purchaseModel.findOne({ razorpayOrderId });
        if (!purchase) return res.json({ received: true });

        // Idempotency
        if (purchase.status === "paid") {
            return res.json({ received: true });
        }

        const note = await NotesUpload.findById(noteId);
        if (!note) return res.json({ received: true });

        const { platformFee, totalAmount } = calculateAmount(note.price);

        // Allow small rounding diff (₹1 tolerance)
        if (Math.abs(paidAmount - totalAmount) > 1) {
            console.error(" Amount mismatch:", { paidAmount, totalAmount });
            return res.json({ received: true });
        }

        purchase.razorpayPaymentId = razorpayPaymentId;
        purchase.platformFee = platformFee;
        purchase.totalAmount = totalAmount;
        purchase.status = "paid";
        await purchase.save();

        await NotesUpload.updateOne({ _id: noteId }, { $inc: { downloads: 1 } });
        await feedModels.updateOne({ note: noteId }, { $inc: { score: 10 } });

        // Credit creator earnings (idempotent)
        await creditCreatorWallet(purchase._id.toString());

        // If you want instant wallet credit (no T+7 wait)
        await releaseEarningImmediately(purchase._id.toString());

        return res.json({ received: true });
    } catch (error) {
        console.error("payment.captured webhook error:", error);
        return res.json({ received: true });
    }
};

/**
 * refund.created
 */
export const handleRefundCreated = async (req: Request, res: Response) => {
    try {
        const refund = req.body?.payload?.refund?.entity;
        if (!refund) return res.json({ received: true });

        const purchase = await purchaseModel.findOne({
            razorpayPaymentId: refund.payment_id,
        });

        if (!purchase) return res.json({ received: true });

        // Idempotency
        if (purchase.razorpayRefundId === refund.id) {
            return res.json({ received: true });
        }

        purchase.razorpayRefundId = refund.id;
        purchase.refundStatus = "processing";
        purchase.refundAmount = (refund.amount || 0) / 100;
        purchase.refundRequestedAt = refund.created_at
            ? new Date(refund.created_at * 1000)
            : new Date();

        await purchase.save();

        return res.json({ received: true });
    } catch (error) {
        console.error("refund.created error:", error);
        return res.json({ received: true });
    }
};

/**
 * refund.processed
 */
export const handleRefundProcessed = async (req: Request, res: Response) => {
    try {
        const refund = req.body?.payload?.refund?.entity;
        if (!refund) return res.json({ received: true });

        const purchase = await purchaseModel.findOne({
            razorpayRefundId: refund.id,
        });

        if (!purchase) return res.json({ received: true });

        // Idempotency
        if (purchase.refundStatus === "completed") {
            return res.json({ received: true });
        }

        const refundedAmount = (refund.amount || 0) / 100;

        purchase.refundStatus = "completed";
        purchase.refundCompletedAt = refund.created_at
            ? new Date(refund.created_at * 1000)
            : new Date();
        purchase.refundAmount = refundedAmount;

        if (refundedAmount >= purchase.totalAmount) {
            purchase.status = "refunded";

            await NotesUpload.updateOne(
                { _id: purchase.note },
                { $inc: { downloads: -1 } }
            );

            await feedModels.updateOne(
                { note: purchase.note },
                { $inc: { score: -10 } }
            );
        } else {
            purchase.status = "partially_refunded";
        }

        await purchase.save();

        // Reverse creator earnings (PASS refunded amount for partial refunds)
        await reverseEarningOnRefund(purchase._id.toString());

        return res.json({ received: true });
    } catch (error) {
        console.error("refund.processed error:", error);
        return res.json({ received: true });
    }
};

/**
 * refund.failed
 */
export const handleRefundFailed = async (req: Request, res: Response) => {
    try {
        const refund = req.body?.payload?.refund?.entity;
        if (!refund) return res.json({ received: true });

        await purchaseModel.updateOne(
            { razorpayRefundId: refund.id },
            { refundStatus: "failed" }
        );

        return res.json({ received: true });
    } catch (error) {
        console.error("refund.failed error:", error);
        return res.json({ received: true });
    }
};

/**
 * ===============================
 * MAIN WEBHOOK ROUTER
 * ===============================
 */
export const handleAllWebhooks = async (req: Request, res: Response) => {
    const event = req.body?.event;

    switch (event) {
        case "payment.captured":
            return handlePaymentCaptured(req, res);

        case "refund.created":
            return handleRefundCreated(req, res);

        case "refund.processed":
            return handleRefundProcessed(req, res);

        case "refund.failed":
            return handleRefundFailed(req, res);

        default:
            return res.json({ received: true });
    }
};
