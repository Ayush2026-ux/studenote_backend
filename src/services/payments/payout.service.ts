import Wallet from "../../models/payments/wallet.model";
import Payout from "../../models/payments/payout.model";
import User from "../../models/users/users.models";
import { sendPayoutStatusEmail } from "../mail/sendPayoutStatusEmail";

export const calculateWithdrawalFee = (amount: number) => {
    const feePercent = amount < 1000 ? 10 : 15; // 10% fee for amounts less than 1000, otherwise 15%
    const feeAmount = Math.round((amount * feePercent) / 100); // Round to nearest integer
    const netAmount = amount; // User receives the full amount, fee is deducted from app's revenue
    return { feePercent, feeAmount, netAmount };
};


export const requestPayout = async (
    userId: string,
    amount: number,
    method: "upi" | "bank",
    city: string,
    upiId?: string,
    holderName?: string,
    bankAccountNumber?: string,
    bankIfsc?: string
) => {
    // Enforce minimum redeemable balance
    if (amount < 100) {
        throw new Error("Minimum redeemable amount is ₹100");
    }

    const wallet = await Wallet.findOneAndUpdate(
        { user: userId, balance: { $gte: amount } },
        { $inc: { balance: -amount } },
        { new: true }
    );

    if (!wallet) throw new Error("Insufficient wallet balance");

    const user: any = await User.findById(userId);
    if (!user) throw new Error("User not found");

    const { feePercent, feeAmount, netAmount } = calculateWithdrawalFee(amount);

    const payout = await Payout.create({
        user: userId,
        amount,
        appFeePercent: feePercent,
        appFee: feeAmount,
        netAmount,
        method,
        status: "requested",
        city,
        upiId,
        bankAccountNumber,
        bankIfsc,
        upiAndAccountHolderName: holderName || user.fullName,
    });

    return payout;
};

export const approvePayoutManual = async (payoutId: string, adminId: string) => {
    const payout: any = await Payout.findById(payoutId).populate("user");
    if (!payout) throw new Error("Payout not found");

    payout.status = "approved";
    payout.approvedBy = adminId;
    payout.approvedAt = new Date();
    await payout.save();

    await sendPayoutStatusEmail({
        to: payout.user.email,
        userName: payout.user.fullName,
        amount: payout.amount,
        netAmount: payout.netAmount,
        method: payout.method,
        status: "approved",
    });

    return payout;
};

export const markPayoutCompletedManually = async (payoutId: string, adminId: string) => {
    const payout: any = await Payout.findById(payoutId).populate("user");
    if (!payout) throw new Error("Payout not found");

    payout.status = "completed";
    payout.approvedBy = adminId;
    payout.approvedAt = new Date();
    await payout.save();

    await Wallet.updateOne(
        { user: payout.user._id },
        { $inc: { totalWithdrawn: payout.amount }, $set: { lastPayoutAt: new Date() } }
    );

    await sendPayoutStatusEmail({
        to: payout.user.email,
        userName: payout.user.fullName,
        amount: payout.amount,
        netAmount: payout.netAmount,
        method: payout.method,
        status: "completed",
    });

    return payout;
};

export const rejectPayout = async (payoutId: string, adminId: string, reason: string) => {
    const payout: any = await Payout.findById(payoutId).populate("user");
    if (!payout) throw new Error("Payout not found");

    payout.status = "rejected";
    payout.rejectedReason = reason;
    payout.approvedBy = adminId;
    payout.approvedAt = new Date();
    await payout.save();

    await Wallet.updateOne(
        { user: payout.user._id },
        { $inc: { balance: payout.amount } }
    );

    await sendPayoutStatusEmail({
        to: payout.user.email,
        userName: payout.user.fullName,
        amount: payout.amount,
        netAmount: payout.netAmount,
        method: payout.method,
        status: "rejected",
        reason,
    });

    return payout;
};


