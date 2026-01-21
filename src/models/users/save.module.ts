import mongoose, { Schema, Document } from "mongoose";

export interface ISavedFeed extends Document {
    user: mongoose.Types.ObjectId;
    feed: mongoose.Types.ObjectId;
    createdAt: Date;
}

const SavedFeedSchema = new Schema<ISavedFeed>(
    {
        user: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        feed: {
            type: Schema.Types.ObjectId,
            ref: "Feed",
            required: true,
            index: true,
        },
    },
    { timestamps: { createdAt: true, updatedAt: false } }
);

SavedFeedSchema.index({ user: 1, feed: 1 }, { unique: true });

export default mongoose.model("SavedFeed", SavedFeedSchema);
