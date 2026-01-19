import mongoose, { Schema, Document } from "mongoose";
import feedModels from "./feed.models";

/* =========================================================
   ENUMS (DB-LEVEL STRICT)
========================================================= */

export const COURSE_IDS = [
  "cs",
  "business",
  "health",
  "science",
  "math",
  "humanities",
  "arts",
  "govt",
  "general",
  "class6",
  "class7",
  "class8",
  "class9",
  "class10",
  "class11",
  "class12",
  "others",
] as const;

export const SEMESTERS = [
  "Semester 1",
  "Semester 2",
  "Semester 3",
  "Semester 4",
  "Semester 5",
  "Semester 6",
  "Semester 7",
  "Semester 8",
] as const;

export const FILE_TYPES = [
  "Handwritten Notes",
  "Typed Notes",
  "Assignment",
  "Question Paper",
  "Study Material",
  "Project Report",
  "Others",
] as const;

/* =========================================================
   INTERFACE
========================================================= */

export interface INote extends Document {
  title: string;
  description: string;

  course: typeof COURSE_IDS[number];
  subject: string;
  semester: typeof SEMESTERS[number];

  fileType: typeof FILE_TYPES[number];
  price: number;

  thumbnail: string;
  file: string;

  university?: string;
  pages?: number;

  uploadedBy: mongoose.Types.ObjectId;

  status: "pending" | "approved" | "rejected";
  reviewMessage?: string;

  views: number;
  downloads: number;

  createdAt: Date;
  updatedAt: Date;
}

/* =========================================================
   SCHEMA
========================================================= */

const NoteSchema = new Schema<INote>(
  {
    title: {
      type: String,
      required: true,
      minlength: 5,
      maxlength: 120,
      trim: true,
    },

    description: {
      type: String,
      required: true,
      minlength: 20,
      maxlength: 500,
    },

    course: {
      type: String,
      enum: COURSE_IDS,
      required: true,
      index: true,
    },

    subject: {
      type: String,
      required: true,
      index: true,
    },

    semester: {
      type: String,
      enum: SEMESTERS,
      index: true,
    },

    fileType: {
      type: String,
      enum: FILE_TYPES,
      required: true,
    },

    price: {
      type: Number,
      required: true,
      min: 3,
    },

    thumbnail: {
      type: String,
      required: true,
    },

    file: {
      type: String,
      required: true,
    },

    university: {
      type: String,
      trim: true,
    },

    pages: {
      type: Number,
      min: 1,
      max: 500,
    },

    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },

    reviewMessage: {
      type: String,
      maxlength: 300,
    },

    views: {
      type: Number,
      default: 0,
    },

    downloads: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

/* =========================================================
   🔥 AUTO CREATE FEED WHEN NOTE IS APPROVED
   (ADDED – nothing removed)
========================================================= */

NoteSchema.post("findOneAndUpdate", async function (doc) {
  try {
    if (!doc) return;

    // Sirf approved hone par feed create hogi
    if (doc.status !== "approved") return;

    await feedModels.updateOne(
      { note: doc._id },
      {
        $setOnInsert: {
          note: doc._id,
          author: doc.uploadedBy,
          visibility: "public",
          isActive: true,
          likes: 0,
          views: 0,
          commentsCount: 0,
          shareCount: 0,
          score: 0,
        },
      },
      { upsert: true }
    );
  } catch (error) {
    console.error("AUTO_FEED_SYNC_ERROR:", error);
  }
});

/* =========================================================
   INDEXES
========================================================= */

NoteSchema.index({ course: 1, subject: 1, semester: 1 });
NoteSchema.index({ status: 1, createdAt: -1 });
NoteSchema.index({ uploadedBy: 1, createdAt: -1 });

export default mongoose.model<INote>("NoteUploads", NoteSchema);
