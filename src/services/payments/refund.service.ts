import razorpayInstance from "../../config/razorpay";
import purchaseModel from "../../models/payments/purchase.model";

interface RefundRequest {
    purchaseId: string;
    reason: string;
}

/**
 * Request refund (STRICT POLICY)
 * - Allowed only if payment failed OR content not delivered
 * - No refunds for successfully delivered digital content
 */
export const requestRefund = async (
    userId: string,
    { purchaseId, reason }: RefundRequest
) => {
    const purchase = await purchaseModel.findById(purchaseId);

    if (!purchase) throw new Error("Purchase not found");

    if (purchase.user.toString() !== userId) {
        throw new Error("Unauthorized");
    }

    if (!purchase.razorpayPaymentId) {
        throw new Error("No successful payment found for this purchase");
    }

    if (purchase.refundStatus === "processing" || purchase.refundStatus === "completed") {
        throw new Error("Refund already requested or completed");
    }

    // 🔐 STRICT REFUND POLICY
    const contentDelivered = true; // replace with real logic if you track delivery

    if (purchase.status === "paid" && contentDelivered) {
        throw new Error("Refund not allowed: Digital content already delivered");
    }

    const amountToRefund = Math.round(purchase.totalAmount * 100);

    const razorpayRefund = await razorpayInstance.payments.refund(
        purchase.razorpayPaymentId,
        {
            amount: amountToRefund,
            notes: { reason, purchaseId, userId },
        }
    );

    purchase.refundStatus = "processing";
    purchase.razorpayRefundId = razorpayRefund.id;
    purchase.refundAmount = amountToRefund / 100;
    purchase.refundReason = reason;
    purchase.refundRequestedAt = new Date();
    purchase.status = "refunded";

    await purchase.save();

    return {
        refundId: razorpayRefund.id,
        status: razorpayRefund.status,
        amount: razorpayRefund.amount! / 100,
        message: "Refund initiated due to payment/content failure",
    };
};

/**
 * Razorpay refund webhook handler
 */
export const handleRefundWebhook = async (refundId: string, status: string) => {
    const purchase = await purchaseModel.findOne({ razorpayRefundId: refundId });
    if (!purchase) return;

    if (status === "processed") {
        purchase.refundStatus = "completed";
        purchase.refundCompletedAt = new Date();
    } else if (status === "failed") {
        purchase.refundStatus = "failed";
    }

    await purchase.save();
};

/**
 * Get refund status (user)
 */
export const getRefundStatus = async (userId: string, purchaseId: string) => {
    const purchase = await purchaseModel.findById(purchaseId);

    if (!purchase) throw new Error("Purchase not found");
    if (purchase.user.toString() !== userId) throw new Error("Unauthorized");

    return {
        purchaseId: purchase._id,
        status: purchase.status,
        refundStatus: purchase.refundStatus,
        refundAmount: purchase.refundAmount,
        refundReason: purchase.refundReason,
        refundRequestedAt: purchase.refundRequestedAt,
        refundCompletedAt: purchase.refundCompletedAt,
        razorpayRefundId: purchase.razorpayRefundId,
    };
};
