import mongoose, { Schema, Document } from "mongoose";

export interface INotification extends Document {
    recipient: mongoose.Types.ObjectId;
    sender: mongoose.Types.ObjectId;
    type: "LIKE" | "COMMENT" | "FOLLOW" | "SAVE";
    feed?: mongoose.Types.ObjectId;
    comment?: mongoose.Types.ObjectId;
    isRead: boolean;
    createdAt: Date;
}

const NotificationSchema = new Schema<INotification>(
    {
        recipient: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        sender: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        type: {
            type: String,
            enum: ["LIKE", "COMMENT", "FOLLOW", "SAVE"],
            required: true,
            index: true,
        },
        feed: {
            type: Schema.Types.ObjectId,
            ref: "Feed",
            index: true,
        },
        comment: {
            type: Schema.Types.ObjectId,
            ref: "Comment",
        },
        isRead: {
            type: Boolean,
            default: false,
            index: true,
        },
    },
    { timestamps: { createdAt: true, updatedAt: false } }
);

// Fast inbox
NotificationSchema.index({ recipient: 1, createdAt: -1 });

// Optional dedupe (LIKE / SAVE spam prevention)
NotificationSchema.index(
    { recipient: 1, sender: 1, type: 1, feed: 1 },
    { unique: true, partialFilterExpression: { feed: { $exists: true } } }
);

export default mongoose.model("Notification", NotificationSchema);
