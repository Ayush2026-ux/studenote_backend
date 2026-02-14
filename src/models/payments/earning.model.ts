import mongoose, { Schema, Document } from "mongoose";

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
        creator: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
        purchase: { type: Schema.Types.ObjectId, ref: "Purchase", required: true, unique: true },
        grossAmount: { type: Number, required: true },
        platformFee: { type: Number, required: true },
        netAmount: { type: Number, required: true },
        status: {
            type: String,
            enum: ["pending", "available", "reversed"],
            default: "pending",
            index: true,
        },
    },
    { timestamps: true }
);

EarningSchema.index({ status: 1, createdAt: 1 });

export default mongoose.model<IEarning>("Earning", EarningSchema);
