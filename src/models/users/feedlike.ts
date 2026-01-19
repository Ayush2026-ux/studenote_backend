import mongoose, { Schema, Document } from "mongoose";

export interface IFeedLike extends Document {
    feed: mongoose.Types.ObjectId;
    user: mongoose.Types.ObjectId;
    createdAt: Date;
}

const FeedLikeSchema = new Schema<IFeedLike>(
    {
        feed: {
            type: Schema.Types.ObjectId,
            ref: "Feed",
            required: true,
            index: true,
        },
        user: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
    },
    { timestamps: { createdAt: true, updatedAt: false } }
);

FeedLikeSchema.index({ feed: 1, user: 1 }, { unique: true });
FeedLikeSchema.index({ user: 1, createdAt: -1 });

export default mongoose.model("FeedLike", FeedLikeSchema);
