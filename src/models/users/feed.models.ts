import mongoose, { Schema, Document } from "mongoose";

/* ================= TYPES ================= */

export interface IFeed extends Document {
    author: mongoose.Types.ObjectId;
    note: mongoose.Types.ObjectId;

    views: number;
    likes: number;
    commentsCount: number;
    shareCount: number;

    visibility: "public" | "followers";
    score: number;

    isActive: boolean;

    createdAt: Date;
    updatedAt: Date;
}

/* ================= SCHEMA ================= */

const FeedSchema = new Schema<IFeed>(
    {
        author: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },

        note: {
            type: Schema.Types.ObjectId,
            ref: "NoteUploads",
            required: true,
            unique: true,
        },

        views: {
            type: Number,
            default: 0,
        },

        likes: {
            type: Number,
            default: 0,
        },

        commentsCount: {
            type: Number,
            default: 0,
        },

        shareCount: {
            type: Number,
            default: 0,
        },

        visibility: {
            type: String,
            enum: ["public", "followers"],
            default: "public",
            index: true,
        },

        score: {
            type: Number,
            default: 0,
        },

        isActive: {
            type: Boolean,
            default: true,
            index: true,
        },
    },
    { timestamps: true }
);

/* ================= OPTIMIZED INDEXES ================= */

FeedSchema.index({
    isActive: 1,
    visibility: 1,
    score: -1,
    createdAt: -1,
});

FeedSchema.index({
    author: 1,
    isActive: 1,
    createdAt: -1,
});

FeedSchema.index(
    { note: 1 },
    { unique: true }
);

export default mongoose.model<IFeed>("Feed", FeedSchema);
