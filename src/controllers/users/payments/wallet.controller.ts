// users/payments/wallet.controller.ts

import { Request, Response } from "express";
import mongoose from "mongoose";
import walletModel from "../../../models/payments/wallet.model";
import payoutModel from "../../../models/payments/payout.model";
import { requestPayout } from "../../../services/payments/payout.service";

interface AuthRequest extends Request {
  user: { _id: string };
}

/* ================= GET WALLET ================= */

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

/* ================= WITHDRAW WALLET ================= */

export const withdrawWallet = async (req: AuthRequest, res: Response) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      amount,
      method,
      city,
      upiId,
      upiAndAccountHolderName,
      bankAccountNumber,
      bankIfsc,
    } = req.body;

    /* 🔥 BASIC VALIDATIONS */

    if (!amount || amount <= 0) {
      throw new Error("Invalid withdrawal amount");
    }

    if (amount < 100) {
      throw new Error("Minimum withdrawal amount is ₹100");
    }

    if (!["upi", "bank"].includes(method)) {
      throw new Error("Invalid withdrawal method");
    }

    /* 🔥 FETCH WALLET */

    const wallet = await walletModel.findOne({ user: req.user._id }).session(
      session
    );

    if (!wallet) {
      throw new Error("Wallet not found");
    }

    if (wallet.balance < amount) {
      throw new Error("Insufficient wallet balance");
    }

    /* 🔥 DEDUCT BALANCE (PREVENT DOUBLE WITHDRAW) */

    wallet.balance -= amount;
    wallet.totalWithdrawn += amount;
    await wallet.save({ session });

    /* 🔥 CREATE PAYOUT RECORD (PENDING ADMIN APPROVAL) */

    const payout = await payoutModel.create(
      [
        {
          user: req.user._id,
          amount,
          method,
          city,
          upiId,
          upiAndAccountHolderName,
          bankAccountNumber,
          bankIfsc,
          status: "pending", // admin approval required
        },
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    /* 🔥 OPTIONAL: If instant payout enabled */
    // await requestPayout(...);

    return res.json({
      success: true,
      message: "Withdrawal request submitted for admin approval",
      payout: payout[0],
    });
  } catch (error: any) {
    await session.abortTransaction();
    session.endSession();

    return res.status(400).json({
      message: error.message || "Withdrawal failed",
    });
  }
};