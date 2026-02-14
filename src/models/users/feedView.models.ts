import mongoose, { Schema, Document } from "mongoose";

export interface IFeedView extends Document {
    feed: mongoose.Types.ObjectId;
    user?: mongoose.Types.ObjectId;
    ip?: string;
    viewCount: number;
    lastViewedAt: Date;
    createdAt: Date;
}

const FeedViewSchema = new Schema<IFeedView>(
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
            index: true,
        },
        ip: {
            type: String,
            index: true,
        },
        viewCount: {
            type: Number,
            default: 1,
            min: 1,
        },
        lastViewedAt: {
            type: Date,
            default: Date.now,
            index: true,
        },
    },
    { timestamps: { createdAt: true, updatedAt: false } }
);

// Deduplicate logged-in users (one record per user per feed)
FeedViewSchema.index(
    { feed: 1, user: 1 },
    { unique: true, partialFilterExpression: { user: { $exists: true } } }
);

// Deduplicate guests (one record per IP per feed)
FeedViewSchema.index(
    { feed: 1, ip: 1 },
    { unique: true, partialFilterExpression: { ip: { $exists: true } } }
);

// Auto cleanup (7 days retention)
FeedViewSchema.index(
    { lastViewedAt: 1 },
    { expireAfterSeconds: 604800 } // 7 days
);

export default mongoose.model("FeedView", FeedViewSchema);
