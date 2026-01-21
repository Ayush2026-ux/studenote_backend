import mongoose, { Schema, Document } from "mongoose";

export interface INoteShare extends Document {
    note: mongoose.Types.ObjectId;
    sharedBy: mongoose.Types.ObjectId;
    createdAt: Date;
}

const NoteShareSchema = new Schema<INoteShare>(
    {
        note: {
            type: Schema.Types.ObjectId,
            ref: "NoteUploads",
            required: true,
            index: true,
        },
        sharedBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
    },
    { timestamps: true }
);

//  Prevent same user spamming instantly
//  sharing the same note multiple times
//  by adding a compound index
//  on note and sharedBy fields
NoteShareSchema.index(
    { note: 1, sharedBy: 1 },
    { unique: false }
);

//  Additional index to prevent
//  rapid shares within a minute
//  by the same user for the same note
NoteShareSchema.index(
    { note: 1, sharedBy: 1, createdAt: 1 },
    { unique: true, partialFilterExpression: { createdAt: { $gt: new Date(Date.now() - 60 * 1000) } } }
);

export default mongoose.model("NoteShare", NoteShareSchema);
