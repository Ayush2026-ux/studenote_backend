import { Request, Response } from "express";
import NotesUpload from "../../models/users/NotesUpload";
import purchaseModel from "../../models/payments/purchase.model";
import feedModels from "../../models/users/feed.models";
import { calculateAmount } from "../../services/payments/razorpay.service";

/**
 * ===============================
 * Razorpay Webhook Handler
 * ===============================
 * Source of truth for payment success
 */

/**
 * PAYMENT CAPTURED
 *  CREATE PURCHASE HERE ONLY
 */
export const handlePaymentCaptured = async (
    req: Request,
    res: Response
) => {
    try {
        const payment = req.body.payload.payment.entity;

        const {
            order_id: razorpayOrderId,
            id: razorpayPaymentId,
            notes,
        } = payment;

        console.log("💳 Payment Details:", {
            razorpayOrderId,
            razorpayPaymentId,
            notes,
        });

        const { noteId, userId, platformFee } = notes;

        if (!noteId || !userId) {
            console.warn("⚠️  Missing noteId or userId in payment notes");
            return res.json({ received: true });
        }

        // Idempotency check (webhook retries)
        const existing = await purchaseModel.findOne({
            razorpayPaymentId,
        });

        if (existing) {
            console.log("ℹ️  Purchase already exists (idempotency check):", razorpayPaymentId);
            return res.json({ received: true });
        }

        const note = await NotesUpload.findById(noteId);
        if (!note) {
            console.warn("⚠️  Note not found:", noteId);
            return res.json({ received: true });
        }

        const { totalAmount } = calculateAmount(note.price);

        try {
            // ✅ CREATE PURCHASE
            const newPurchase = await purchaseModel.create({
                user: userId,
                note: noteId,

                razorpayOrderId,
                razorpayPaymentId,

                amount: note.price,
                platformFee,
                totalAmount,

                status: "paid",
            });

            console.log("✅ Purchase created:", newPurchase._id);

            // Side effects
            await NotesUpload.updateOne(
                { _id: noteId },
                { $inc: { downloads: 1 } }
            );

            await feedModels.updateOne(
                { note: noteId },
                { $inc: { score: 10 } }
            );

            console.log("✨ Payment captured & purchase created:", razorpayPaymentId);
        } catch (dbError: any) {
            // Handle duplicate key error (user already bought this note)
            if (dbError.code === 11000) {
                console.warn("⚠️  Duplicate purchase attempt - User already owns this note");
                console.warn("   Payment:", razorpayPaymentId);
                console.warn("   User:", userId, "Note:", noteId);
                // Still return success so Razorpay doesn't retry
                return res.json({ received: true });
            }
            // Re-throw other errors
            throw dbError;
        }

        res.json({ received: true });
    } catch (error) {
        console.error("❌ payment.captured webhook error:", error);
        res.json({ received: true }); // Razorpay retries if not 200
    }
};

/**
 * ===============================
 * REFUND WEBHOOKS
 * ===============================
 */

export const handleRefundCreated = async (req: Request, res: Response) => {
    try {
        const refund = req.body.payload.refund.entity;

        const purchase = await purchaseModel.findOne({
            razorpayPaymentId: refund.payment_id,
        });

        if (purchase) {
            purchase.razorpayRefundId = refund.id;
            purchase.refundStatus = "processing";
            purchase.refundAmount = refund.amount / 100; // paise → rupees
            purchase.refundRequestedAt = new Date();
            await purchase.save();
        }

        res.json({ received: true });
    } catch (error) {
        console.error("refund.created error:", error);
        res.json({ received: true });
    }
};

export const handleRefundProcessed = async (req: Request, res: Response) => {
    try {
        const refund = req.body.payload.refund.entity;

        const purchase = await purchaseModel.findOne({
            razorpayRefundId: refund.id,
        });

        if (!purchase) {
            return res.json({ received: true });
        }

        purchase.refundStatus = "completed";
        purchase.refundCompletedAt = new Date();

        if (purchase.refundAmount === purchase.totalAmount) {
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
        res.json({ received: true });
    } catch (error) {
        console.error("refund.processed error:", error);
        res.json({ received: true });
    }
};

export const handleRefundFailed = async (req: Request, res: Response) => {
    try {
        const refund = req.body.payload.refund.entity;

        const purchase = await purchaseModel.findOne({
            razorpayRefundId: refund.id,
        });

        if (purchase) {
            purchase.refundStatus = "failed";
            await purchase.save();
        }

        res.json({ received: true });
    } catch (error) {
        console.error("refund.failed error:", error);
        res.json({ received: true });
    }
};

/**
 * ===============================
 * MAIN WEBHOOK ROUTER
 * ===============================
 */
export const handleAllWebhooks = async (req: Request, res: Response) => {
    const event = req.body.event;

    console.log("🔔 Webhook Event Received:", event);
    console.log("📦 Full Payload:", JSON.stringify(req.body, null, 2));

    switch (event) {
        case "payment.captured":
            console.log("💰 Processing payment.captured");
            return handlePaymentCaptured(req, res);

        case "refund.created":
            console.log("↩️  Processing refund.created");
            return handleRefundCreated(req, res);

        case "refund.processed":
            console.log("✅ Processing refund.processed");
            return handleRefundProcessed(req, res);

        case "refund.failed":
            console.log("❌ Processing refund.failed");
            return handleRefundFailed(req, res);

        default:
            console.warn("⚠️  Unknown webhook event:", event);
            return res.json({ received: true });
    }
};
