import mongoose, { Schema, Document } from "mongoose";

export interface IPurchase extends Document {
    user: mongoose.Types.ObjectId;
    note: mongoose.Types.ObjectId;

    razorpayOrderId: string;
    razorpayPaymentId?: string;

    amount: number;
    platformFee: number;
    totalAmount: number;

    status: "created" | "paid" | "failed" | "refunded" | "partially_refunded";

    refundStatus?: "processing" | "completed" | "failed";
    razorpayRefundId?: string;
    refundAmount?: number;
    refundReason?: string;
    refundRequestedAt?: Date;
    refundCompletedAt?: Date;
}

const PurchaseSchema = new Schema<IPurchase>(
    {
        user: { type: Schema.Types.ObjectId, ref: "User", required: true },
        note: { type: Schema.Types.ObjectId, ref: "NoteUploads", required: true },

        razorpayOrderId: { type: String, required: true, unique: true, index: true },
        razorpayPaymentId: { type: String, index: true },

        amount: { type: Number, required: true },
        platformFee: { type: Number, required: true },
        totalAmount: { type: Number, required: true },

        status: {
            type: String,
            enum: ["created", "paid", "failed", "refunded", "partially_refunded"],
            default: "created",
            index: true,
        },

        refundStatus: { 
            type: String,
            enum: ["processing", "completed", "failed"],
            index: true,
        },

        razorpayRefundId: { type: String, index: true },
        refundAmount: Number,
        refundReason: String,
        refundRequestedAt: Date,
        refundCompletedAt: Date,
    },
    { timestamps: true }
);

/**
 * Unique active purchase per user per note
 * Blocks: created, paid, partially_refunded
 * Allows: refunded, failed
 */

PurchaseSchema.index(
    { user: 1, note: 1 },
    {
        unique: true,
        partialFilterExpression: {
            status: { $in: ["created", "paid", "partially_refunded"] },
        },
    }
);

export default mongoose.model<IPurchase>("Purchase", PurchaseSchema);
