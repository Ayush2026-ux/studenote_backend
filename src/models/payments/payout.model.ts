import mongoose, { Schema, Document } from "mongoose";

export interface IPayout extends Document {
    user: mongoose.Types.ObjectId;
    amount: number;
    appFeePercent: number;
    appFee: number;
    netAmount: number;
    method: "upi" | "bank";
    status: "requested" | "approved" | "processing" | "completed" | "failed" | "rejected";
    approvedBy?: mongoose.Types.ObjectId;
    approvedAt?: Date;
    rejectedReason?: string;
    failureReason?: string;
    upiId?: string;
    bankAccountNumber?: string;
    bankIfsc?: string;
    city?: string;
    upiAndAccountHolderName?: string;
}

const PayoutSchema = new Schema<IPayout>(
    {
        user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
        amount: { type: Number, required: true, min: 1 },
        appFeePercent: { type: Number, required: true },
        appFee: { type: Number, required: true },
        netAmount: { type: Number, required: true },
        method: { type: String, enum: ["upi", "bank"], required: true },
        status: {
            type: String,
            enum: ["requested", "approved", "processing", "completed", "failed", "rejected"],
            default: "requested",
            index: true,
        },
        approvedBy: { type: Schema.Types.ObjectId, ref: "User" },
        approvedAt: Date,
        rejectedReason: String,
        failureReason: String,
        upiId: String,
        bankAccountNumber: String,
        bankIfsc: String,
        city: String,
        upiAndAccountHolderName: String,
    },
    { timestamps: true }
);

PayoutSchema.index({ status: 1, createdAt: -1 });

export default mongoose.model<IPayout>("Payout", PayoutSchema);
