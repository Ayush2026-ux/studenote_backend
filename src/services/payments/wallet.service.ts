import mongoose from "mongoose";
import Wallet from "../../models/payments/wallet.model";
import Earning from "../../models/payments/earning.model";
import purchaseModel from "../../models/payments/purchase.model";

/**
 * Create earning in "pending" state (idempotent)
 * Called from payment.captured webhook
 */
export const creditCreatorWallet = async (purchaseId: string) => {
    const purchase = await purchaseModel.findById(purchaseId).populate("note");
    if (!purchase) return;

    const note: any = purchase.note;
    const creatorId = note.uploadedBy;

    const netAmount = purchase.amount - purchase.platformFee;

    // Create earning only once
    await Earning.updateOne(
        { purchase: purchase._id },
        {
            $setOnInsert: {
                creator: creatorId,
                purchase: purchase._id,
                grossAmount: purchase.amount,
                platformFee: purchase.platformFee,
                netAmount,
                status: "pending",
            },
        },
        { upsert: true }
    );
};

/**
 * Immediately release earning to wallet (NO WAITING PERIOD)
 * Safe for retries + parallel webhooks
 */
export const releaseEarningImmediately = async (purchaseId: string) => {
    const earning = await Earning.findOne({ purchase: purchaseId });
    if (!earning || earning.status !== "pending") return;

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const locked = await Earning.findOneAndUpdate(
            { _id: earning._id, status: "pending" },
            { $set: { status: "available" } },
            { new: true, session }
        );

        if (!locked) {
            await session.abortTransaction();
            session.endSession();
            return;
        }

        await Wallet.updateOne(
            { user: locked.creator },
            { $inc: { balance: locked.netAmount, totalEarned: locked.netAmount } },
            { upsert: true, session }
        );

        await session.commitTransaction();
        session.endSession();

        console.log(`[EARNINGS] Instantly credited ₹${locked.netAmount}`);
    } catch (err) {
        await session.abortTransaction();
        session.endSession();
        console.error("[EARNINGS] Instant credit failed:", err);
    }
};

/**
 * Reverse earnings on refund
 * - If earning is pending → mark reversed
 * - If earning is available → debit wallet (no negative balance)
 */
export const reverseEarningOnRefund = async (purchaseId: string) => {
    const earning = await Earning.findOne({ purchase: purchaseId });
    if (!earning || earning.status === "reversed") return;

    if (earning.status === "available") {
        const wallet = await Wallet.findOne({ user: earning.creator });
        const currentBalance = wallet?.balance || 0;
        const debit = Math.min(currentBalance, earning.netAmount);

        await Wallet.updateOne(
            { user: earning.creator },
            { $inc: { balance: -debit } }
        );
    }

    earning.status = "reversed";
    await earning.save();

    console.log(`[EARNINGS] Reversed ₹${earning.netAmount} for purchase ${purchaseId}`);
};
