import mongoose, { Schema, Document } from "mongoose";

export interface IFollow extends Document {
    follower: mongoose.Types.ObjectId;
    following: mongoose.Types.ObjectId;
    createdAt: Date;
}

const FollowSchema = new Schema<IFollow>(
    {
        follower: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        following: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
    },
    { timestamps: { createdAt: true, updatedAt: false } }
);

FollowSchema.index({ follower: 1, following: 1 }, { unique: true });
FollowSchema.index({ following: 1, createdAt: -1 });
FollowSchema.index({ follower: 1, createdAt: -1 });

export default mongoose.model("Follow", FollowSchema);
