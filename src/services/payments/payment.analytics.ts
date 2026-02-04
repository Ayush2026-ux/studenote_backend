import purchaseModel from "../../models/payments/purchase.model";

interface PaymentMetrics {
    totalRevenue: number;
    totalRefunds: number;
    refundRate: number;
    successfulPayments: number;
    failedPayments: number;
    totalTransactions: number;
}

export const getPaymentMetrics = async (): Promise<PaymentMetrics> => {
    try {
        const totalTransactions = await purchaseModel.countDocuments();
        const successfulPayments = await purchaseModel.countDocuments({ status: "paid" });
        const failedPayments = await purchaseModel.countDocuments({ status: "failed" });
        const refundedPayments = await purchaseModel.countDocuments({
            status: { $in: ["refunded", "partially_refunded"] },
        });

        const revenueData = await purchaseModel.aggregate([
            { $match: { status: "paid" } },
            { $group: { _id: null, total: { $sum: "$amount" } } },
        ]);

        const refundData = await purchaseModel.aggregate([
            { $match: { refundStatus: "completed" } },
            { $group: { _id: null, total: { $sum: "$refundAmount" } } },
        ]);

        const totalRevenue = revenueData[0]?.total || 0;
        const totalRefunds = refundData[0]?.total || 0;
        const refundRate = successfulPayments > 0
            ? parseFloat(((refundedPayments / successfulPayments) * 100).toFixed(2))
            : 0;

        return {
            totalRevenue,
            totalRefunds,
            refundRate,
            successfulPayments,
            failedPayments,
            totalTransactions,
        };
    } catch (error) {
        console.error("Error getting payment metrics:", error);
        throw error;
    }
};

export const getRefundAnalytics = async (days: number = 30) => {
    try {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const refunds = await purchaseModel.aggregate([
            {
                $match: {
                    refundRequestedAt: { $gte: startDate },
                    refundStatus: { $exists: true },
                },
            },
            {
                $group: {
                    _id: "$refundStatus",
                    count: { $sum: 1 },
                    totalAmount: { $sum: "$refundAmount" },
                },
            },
        ]);

        const refundReasons = await purchaseModel.aggregate([
            {
                $match: {
                    refundRequestedAt: { $gte: startDate },
                    refundReason: { $exists: true },
                },
            },
            {
                $group: {
                    _id: "$refundReason",
                    count: { $sum: 1 },
                },
            },
            { $sort: { count: -1 } },
        ]);

        return {
            refundsByStatus: refunds,
            refundReasons,
            period: `Last ${days} days`,
        };
    } catch (error) {
        console.error("Error getting refund analytics:", error);
        throw error;
    }
};

export const validateRefundEligibility = async (purchaseId: string): Promise<{
    eligible: boolean;
    reason?: string;
    refundableAmount?: number;
}> => {
    try {
        const purchase = await purchaseModel.findById(purchaseId);

        if (!purchase) {
            return { eligible: false, reason: "Purchase not found" };
        }

        if (purchase.status !== "paid") {
            return { eligible: false, reason: "Only paid purchases can be refunded" };
        }

        if (purchase.refundStatus === "completed") {
            return { eligible: false, reason: "Refund already completed for this purchase" };
        }

        // 30-day refund window
        const refundDeadline = new Date(purchase.createdAt);
        refundDeadline.setDate(refundDeadline.getDate() + 30);

        if (new Date() > refundDeadline) {
            return {
                eligible: false,
                reason: `Refund period expired. Refund available until ${refundDeadline.toISOString()}`,
            };
        }

        const note = await require("../../models/users/NotesUpload").findById(purchase.note);
        if (!note) {
            return { eligible: false, reason: "Associated note not found" };
        }

        // Check download count - allow refund if user hasn't over-downloaded
        const downloadCount = purchase.amount ? 1 : 0; // Simplified check
        if (downloadCount > 3) {
            return { eligible: false, reason: "Cannot refund: Content downloaded more than 3 times" };
        }

        return {
            eligible: true,
            refundableAmount: purchase.totalAmount,
        };
    } catch (error) {
        console.error("Error validating refund eligibility:", error);
        throw error;
    }
};
