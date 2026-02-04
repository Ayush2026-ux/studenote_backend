import mongoose, { Schema, Document } from "mongoose";

export interface IPurchase extends Document {
    user: mongoose.Types.ObjectId;
    note: mongoose.Types.ObjectId;

    razorpayOrderId: string;
    razorpayPaymentId?: string;
    razorpaySignature?: string;

    amount: number;
    platformFee: number;
    totalAmount: number;

    status: "created" | "paid" | "failed" | "refunded" | "partially_refunded";

    refundStatus?: "pending" | "processing" | "completed" | "failed";
    razorpayRefundId?: string;
    refundAmount?: number;
    refundReason?: string;
    refundRequestedAt?: Date;
    refundCompletedAt?: Date;

    createdAt: Date;
    updatedAt: Date;
}

const PurchaseSchema = new Schema<IPurchase>(
    {
        user: { type: Schema.Types.ObjectId, ref: "User", required: true },
        note: { type: Schema.Types.ObjectId, ref: "NoteUploads", required: true },

        razorpayOrderId: { type: String, required: true, unique: true },
        razorpayPaymentId: String,
        razorpaySignature: String,

        amount: { type: Number, required: true },
        platformFee: { type: Number, required: true },
        totalAmount: { type: Number, required: true },

        status: {
            type: String,
            enum: ["created", "paid", "failed", "refunded", "partially_refunded"],
            default: "created",
        },

        refundStatus: {
            type: String,
            enum: ["pending", "processing", "completed", "failed"],
            default: undefined,
        },
        razorpayRefundId: String,
        refundAmount: Number,
        refundReason: String,
        refundRequestedAt: Date,
        refundCompletedAt: Date,
    },
    { timestamps: true }
);

PurchaseSchema.index({ user: 1, note: 1 }, { unique: true });
PurchaseSchema.index({ razorpayOrderId: 1 });
PurchaseSchema.index({ razorpayPaymentId: 1 });
PurchaseSchema.index({ razorpayRefundId: 1 });
PurchaseSchema.index({ refundStatus: 1, refundRequestedAt: 1 });
PurchaseSchema.index({ status: 1, refundStatus: 1 });

export default mongoose.model<IPurchase>("Purchase", PurchaseSchema);
