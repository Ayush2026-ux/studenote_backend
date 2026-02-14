import { Request, Response } from "express";
import walletModel from "../../../models/payments/wallet.model";
import { requestPayout } from "../../../services/payments/payout.service";

interface AuthRequest extends Request {
    user: { _id: string };
}

/**
 * Get wallet summary
 */
export const getWallet = async (req: AuthRequest, res: Response) => {
    try {
        let wallet = await walletModel.findOne({ user: req.user._id });

        if (!wallet) {
            wallet = await walletModel.create({
                user: req.user._id,
                balance: 0,
                totalEarned: 0,
                totalWithdrawn: 0,
            });
        }

        return res.json(wallet);
    } catch (error) {
        console.error("getWallet error:", error);
        return res.status(500).json({ message: "Failed to fetch wallet" });
    }
};

/**
 * Request withdrawal to UPI (Admin approval)
 */
// controllers/user/payments/wallet.controller.tsimport { Request, Response } from "express";

interface AuthRequest extends Request {
    user: { _id: string };
}

export const withdrawWallet = async (req: AuthRequest, res: Response) => {
    try {
        const { amount, method, city, upiId, upiAndAccountHolderName, bankAccountNumber, bankIfsc } = req.body;

        const payout = await requestPayout(
            req.user._id,
            amount,
            method,
            city,
            upiId,
            upiAndAccountHolderName,
            bankAccountNumber,
            bankIfsc
        );

        res.json({ success: true, payout });
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};
