import Wallet from "../../models/payments/wallet.model";
import Earning from "../../models/payments/earning.model";
import purchaseModel from "../../models/payments/purchase.model";

/**
 * Create earning in "pending" state (idempotent)
 * Ensure wallet exists (balance may be 0 initially)
 */
export const creditCreatorWallet = async (purchaseId: string) => {
    const purchase = await purchaseModel.findById(purchaseId).populate("note");
    if (!purchase) return;

    const note: any = purchase.note;
    const creatorId = note.uploadedBy;


  // Calculate net amount for creator (used for wallet credit and payout calculations)
    const netAmount = purchase.amount - purchase.platformFee;

    // 1️ Ensure wallet exists (no balance change yet)
    await Wallet.updateOne(
        { user: creatorId },
        { $setOnInsert: { balance: 0, totalEarned: 0, totalWithdrawn: 0 } },
        { upsert: true }
    );

    // 2️ Create earning (idempotent)
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
