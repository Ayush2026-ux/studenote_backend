import mongoose, { Schema, Document } from "mongoose";

export interface IComment extends Document {
    feed: mongoose.Types.ObjectId;
    note?: mongoose.Types.ObjectId;
    author: mongoose.Types.ObjectId;
    content: string;
    likes: number;
    
    parentComment?: mongoose.Types.ObjectId | null;
    rootComment?: mongoose.Types.ObjectId | null; // ✅ ADD
    isDeleted: boolean;
    likedBy: mongoose.Types.ObjectId[];
    createdAt: Date;
}

const CommentSchema = new Schema<IComment>(
    {
        feed: {
            type: Schema.Types.ObjectId,
            ref: "Feed",
            required: true,
            index: true,
        },
        note: {
            type: Schema.Types.ObjectId,
            ref: "NoteUploads",
            required: false,
            index: true,
        },
        author: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        content: {
            type: String,
            required: true,
            maxlength: 500,
            trim: true,
        },
        likes: { type: Number, default: 0 },

        parentComment: {
            type: Schema.Types.ObjectId,
            ref: "Comment",
            default: null,
            index: true,
        },

        // 🔥 ADD THIS FIELD
        rootComment: {
            type: Schema.Types.ObjectId,
            ref: "Comment",
            default: null,
            index: true,
        },

        isDeleted: {
            type: Boolean,
            default: false,
            index: true,
        },
        
        likedBy: {
            type: [Schema.Types.ObjectId],
            ref: "User",
            default: [],
        },

    },
    { timestamps: { createdAt: true, updatedAt: false } }
);

/* ===== INDEXES ===== */
CommentSchema.index({ feed: 1, createdAt: -1 });
CommentSchema.index({ parentComment: 1, createdAt: 1 });
CommentSchema.index({ rootComment: 1, createdAt: 1 }); // ✅ NEW
CommentSchema.index({ author: 1, createdAt: -1 });

export default mongoose.model("Comment", CommentSchema);
