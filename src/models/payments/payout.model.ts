import mongoose from "mongoose";
import { Schema } from "mongoose";

export interface IPayout extends Document {
    user: mongoose.Types.ObjectId;
    amount: number;
    method: "upi" | "bank";
    status: "requested" | "processing" | "completed" | "failed";
    razorpayPayoutId?: string;
    failureReason?: string;
}

const PayoutSchema = new Schema<IPayout>(
    {
        user: { type: Schema.Types.ObjectId, ref: "User", required: true },
        amount: { type: Number, required: true },
        method: { type: String, enum: ["upi", "bank"], required: true },
        status: {
            type: String,
            enum: ["requested", "processing", "completed", "failed"],
            default: "requested",
        },
        razorpayPayoutId: String,
        failureReason: String,
    },
    { timestamps: true }
);

export default mongoose.model<IPayout>("Payout", PayoutSchema);
