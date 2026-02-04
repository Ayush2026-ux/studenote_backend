import razorpayInstance from "../../config/razorpay";
import purchaseModel from "../../models/payments/purchase.model";
import NotesUpload from "../../models/users/NotesUpload";
import feedModels from "../../models/users/feed.models";

interface RefundRequest {
    purchaseId: string;
    reason: string;
    refundAmount?: number;
}

export const requestRefund = async (
    userId: string,
    { purchaseId, reason, refundAmount }: RefundRequest
) => {
    const purchase = await purchaseModel.findById(purchaseId);

    if (!purchase) {
        throw new Error("Purchase not found");
    }

    if (purchase.user.toString() !== userId) {
        throw new Error("Unauthorized: This purchase does not belong to you");
    }

    if (purchase.status !== "paid") {
        throw new Error("Can only refund paid purchases");
    }

    if (purchase.refundStatus === "processing" || purchase.refundStatus === "completed") {
        throw new Error("Refund already requested or completed for this purchase");
    }

    const amountToRefund = Math.round((refundAmount || purchase.totalAmount) * 100);

    if (amountToRefund > purchase.totalAmount * 100) {
        throw new Error("Refund amount cannot exceed total purchase amount");
    }

    // Create refund with Razorpay
    const razorpayRefund = await razorpayInstance.payments.refund(
        purchase.razorpayPaymentId!,
        {
            amount: amountToRefund,
            notes: {
                reason,
                purchaseId,
                userId,
            },
        }
    );

    // Start transaction for atomic updates
    const session = await purchaseModel.startSession();
    session.startTransaction();

    try {
        // Update purchase with refund details
        purchase.refundStatus = "processing";
        purchase.razorpayRefundId = razorpayRefund.id;
        purchase.refundAmount = amountToRefund / 100;
        purchase.refundReason = reason;
        purchase.refundRequestedAt = new Date();

        // Update status based on refund amount
        if (amountToRefund === purchase.totalAmount * 100) {
            purchase.status = "refunded";
        } else {
            purchase.status = "partially_refunded";
        }

        await purchase.save({ session });

        // Decrement downloads if full refund
        if (amountToRefund === purchase.totalAmount * 100) {
            await NotesUpload.updateOne(
                { _id: purchase.note },
                { $inc: { downloads: -1 } },
                { session }
            );

            // Decrement feed score
            await feedModels.updateOne(
                { note: purchase.note },
                { $inc: { score: -10 } },
                { session }
            );
        }

        await session.commitTransaction();

        return {
            refundId: razorpayRefund.id,
            status: razorpayRefund.status,
            amount: (razorpayRefund.amount || amountToRefund) / 100,
            message: "Refund initiated successfully",
        };
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
};

export const handleRefundWebhook = async (
    refundId: string,
    status: string,
    paymentId?: string
) => {
    const purchase = await purchaseModel.findOne({
        razorpayRefundId: refundId,
    });

    if (!purchase) {
        console.warn(`Purchase not found for refund: ${refundId}`);
        return;
    }

    const session = await purchaseModel.startSession();
    session.startTransaction();

    try {
        if (status === "processed") {
            purchase.refundStatus = "completed";
            purchase.refundCompletedAt = new Date();
        } else if (status === "failed") {
            purchase.refundStatus = "failed";
        }

        await purchase.save({ session });
        await session.commitTransaction();
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
};

export const getRefundStatus = async (userId: string, purchaseId: string) => {
    const purchase = await purchaseModel.findById(purchaseId);

    if (!purchase) {
        throw new Error("Purchase not found");
    }

    if (purchase.user.toString() !== userId) {
        throw new Error("Unauthorized");
    }

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

export const getRefundPolicy = () => {
    return {
        policy: "30-day money-back guarantee",
        details: {
            refundPeriod: "30 days from purchase",
            refundableAmount: "100% of purchase amount",
            processingTime: "7-8 working days",
            restrictions: [
                "Refund only available within 30 days of purchase",
                "Note must not be modified",
                "User must not have downloaded more than 3 times",
            ],
        },
    };
};

/**
 * Auto-process pending refunds after 7-8 working days
 * Calculates business days (excluding weekends and optionally holidays)
 * Automatically marks refunds as completed and credits to user account
 */
export const autoProcessRefunds = async () => {
    try {
        console.log("Starting auto-refund processing...");

        // Find all refunds in "processing" state
        const pendingRefunds = await purchaseModel.find({
            refundStatus: "processing",
            refundRequestedAt: { $exists: true },
        });

        let processedCount = 0;
        let failedCount = 0;

        for (const purchase of pendingRefunds) {
            try {
                // Calculate business days elapsed
                const businessDaysElapsed = calculateBusinessDays(
                    purchase.refundRequestedAt!,
                    new Date()
                );

                // Auto-complete refund after 7-8 working days
                if (businessDaysElapsed >= 7) {
                    const session = await purchaseModel.startSession();
                    session.startTransaction();

                    try {
                        purchase.refundStatus = "completed";
                        purchase.refundCompletedAt = new Date();
                        await purchase.save({ session });

                        console.log(
                            `Auto-completed refund for purchase ${purchase._id} after ${businessDaysElapsed} business days`
                        );

                        await session.commitTransaction();
                        processedCount++;
                    } catch (error) {
                        await session.abortTransaction();
                        console.error(`Failed to auto-process refund ${purchase._id}:`, error);
                        failedCount++;
                    } finally {
                        session.endSession();
                    }
                }
            } catch (error) {
                console.error(`Error processing refund ${purchase._id}:`, error);
                failedCount++;
            }
        }

        console.log(
            `Auto-refund processing completed: ${processedCount} processed, ${failedCount} failed`
        );

        return {
            processedCount,
            failedCount,
            timestamp: new Date(),
        };
    } catch (error) {
        console.error("Error in autoProcessRefunds:", error);
        throw error;
    }
};

/**
 * Calculate business days between two dates (excluding weekends)
 * @param startDate - Start date
 * @param endDate - End date
 * @returns Number of business days
 */
const calculateBusinessDays = (startDate: Date, endDate: Date): number => {
    let count = 0;
    const curDate = new Date(startDate);

    while (curDate <= endDate) {
        const dayOfWeek = curDate.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
            // 0 = Sunday, 6 = Saturday
            count++;
        }
        curDate.setDate(curDate.getDate() + 1);
    }

    return count;
};

/**
 * Get refunds approaching auto-completion (6-7 days)
 * Useful for sending notifications to users
 */
export const getRefundsNearCompletion = async () => {
    try {
        const pendingRefunds = await purchaseModel.find({
            refundStatus: "processing",
            refundRequestedAt: { $exists: true },
        });

        const nearCompletion = [];

        for (const purchase of pendingRefunds) {
            const businessDaysElapsed = calculateBusinessDays(
                purchase.refundRequestedAt!,
                new Date()
            );

            if (businessDaysElapsed >= 6 && businessDaysElapsed < 8) {
                nearCompletion.push({
                    purchaseId: purchase._id,
                    refundedAmount: purchase.refundAmount,
                    userId: purchase.user,
                    businessDaysElapsed,
                    expectedCompletionDays: 8 - businessDaysElapsed,
                    refundRequestedAt: purchase.refundRequestedAt,
                });
            }
        }

        return nearCompletion;
    } catch (error) {
        console.error("Error getting refunds near completion:", error);
        throw error;
    }
};

/**
 * Get refund processing status for admin dashboard
 */
export const getRefundProcessingStats = async () => {
    try {
        const stats = await purchaseModel.aggregate([
            {
                $match: {
                    refundStatus: { $in: ["processing", "completed", "failed"] },
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

        const processingRefunds = await purchaseModel.find({
            refundStatus: "processing",
            refundRequestedAt: { $exists: true },
        });

        const refundTimelines = processingRefunds.map((purchase) => ({
            purchaseId: purchase._id,
            userId: purchase.user,
            refundAmount: purchase.refundAmount,
            businessDaysElapsed: calculateBusinessDays(
                purchase.refundRequestedAt!,
                new Date()
            ),
            status: purchase.refundStatus,
            requestedAt: purchase.refundRequestedAt,
        }));

        return {
            summary: stats,
            timeline: refundTimelines,
            timestamp: new Date(),
        };
    } catch (error) {
        console.error("Error getting refund processing stats:", error);
        throw error;
    }
};
