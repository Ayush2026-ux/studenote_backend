import mongoose, { Schema, Document } from "mongoose";

export interface IFeedView extends Document {
    feed: mongoose.Types.ObjectId;
    user?: mongoose.Types.ObjectId;
    ip?: string;
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
    },
    { timestamps: { createdAt: true, updatedAt: false } }
);

// Deduplicate logged-in users
FeedViewSchema.index(
    { feed: 1, user: 1 },
    { unique: true, partialFilterExpression: { user: { $exists: true } } }
);

// Deduplicate guests
FeedViewSchema.index(
    { feed: 1, ip: 1 },
    { unique: true, partialFilterExpression: { ip: { $exists: true } } }
);

// Auto cleanup (VERY IMPORTANT)
FeedViewSchema.index(
    { createdAt: 1 },
    { expireAfterSeconds: 86400 } // 24h
);

export default mongoose.model("FeedView", FeedViewSchema);
