import mongoose from "mongoose";
import { Schema } from "mongoose";

export interface IEarning extends Document {
    creator: mongoose.Types.ObjectId;
    purchase: mongoose.Types.ObjectId;
    grossAmount: number;
    platformFee: number;
    netAmount: number;
    status: "pending" | "available" | "reversed";
}

const EarningSchema = new Schema<IEarning>(
    {
        creator: { type: Schema.Types.ObjectId, ref: "User", required: true },
        purchase: { type: Schema.Types.ObjectId, ref: "Purchase", required: true },
        grossAmount: Number,
        platformFee: Number,
        netAmount: Number,
        status: {
            type: String,
            enum: ["pending", "available", "reversed"],
            default: "pending",
        },
    },
    { timestamps: true }
);

export default mongoose.model<IEarning>("Earning", EarningSchema);
