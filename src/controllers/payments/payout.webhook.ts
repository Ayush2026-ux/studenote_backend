import { Request, Response } from "express";
import Payout from "../../models/payments/payout.model";
import Wallet from "../../models/payments/wallet.model";

export const handlePayoutWebhook = async (req: Request, res: Response) => {
    const event = req.body.event;
    const payout = req.body.payload?.payout?.entity;

    if (!payout) return res.json({ received: true });

    const record = await Payout.findOne({ razorpayPayoutId: payout.id });
    if (!record) return res.json({ received: true });

    if (event === "payout.processed") {
        record.status = "completed";

        await Wallet.updateOne(
            { user: record.user },
            {
                $inc: { balance: -record.amount, totalWithdrawn: record.amount },
                $set: { lastPayoutAt: new Date() },
            }
        );
    }

    if (event === "payout.failed") {
        record.status = "failed";
        record.failureReason = payout.failure_reason;
    }

    await record.save();
    res.json({ received: true });
};
