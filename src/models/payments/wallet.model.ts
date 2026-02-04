import mongoose from "mongoose";
import { Schema } from "mongoose";

export interface IWallet extends Document {
    user: mongoose.Types.ObjectId; // creator
    balance: number;
    totalEarned: number;
    totalWithdrawn: number;
    lastPayoutAt?: Date;
}

const WalletSchema = new Schema<IWallet>(
    {
        user: { type: Schema.Types.ObjectId, ref: "User", unique: true },
        balance: { type: Number, default: 0 },
        totalEarned: { type: Number, default: 0 },
        totalWithdrawn: { type: Number, default: 0 },
        lastPayoutAt: Date,
    },
    { timestamps: true }
);

export default mongoose.model<IWallet>("Wallet", WalletSchema);
