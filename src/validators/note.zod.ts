import { z } from "zod";

/* =========================================================
   ENUMS
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
] as const;

/* =========================================================
   FILE TYPE PRICING RULES
========================================================= */

export const FILE_TYPE_PRICING = {
    "Handwritten Notes": { MIN: 3, MAX: 15 },
    "Typed Notes": { MIN: 3, MAX: 8 },
    Assignment: { MIN: 3, MAX: 7 },
    "Question Paper": { MIN: 3, MAX: 5 },
    "Study Material": { MIN: 3, MAX: 10 },
    "Project Report": { MIN: 5, MAX: 12 },
} as const;

/* =========================================================
   CREATE NOTE (WITH CLEAR MESSAGES)
========================================================= */



export const createNoteSchema = z
    .object({
        title: z
            .string({ message: "Title is required" })
            .min(5, { message: "Title must be at least 5 characters" })
            .max(120, { message: "Title must be at most 120 characters" })
            .trim(),

        description: z
            .string({ message: "Description is required" })
            .min(20, { message: "Description must be at least 20 characters" })
            .max(500, { message: "Description must be at most 500 characters" }),

        course: z.enum(COURSE_IDS, {
            message: "Please select a valid course",
        }),

        subject: z
            .string({ message: "Subject is required" })
            .min(1, { message: "Please select a subject" }),

        // Update this specific field in your schema
        semester: z.preprocess(
            (val) => {
                if (typeof val !== "string") return undefined;

                const cleaned = val.trim();

                if (
                    cleaned === "" ||
                    cleaned === "undefined" ||
                    cleaned === "null"
                ) {
                    return undefined;
                }

                return cleaned;
            },
            z.enum(SEMESTERS)
        ).optional(),




        fileType: z.enum(FILE_TYPES, {
            message: "Please select a file type",
        }),

        price: z
            .number({ message: "Price must be a number" })
            .int({ message: "Price must be a whole number" })
            .positive({ message: "Price must be greater than 0" }),


        thumbnail: z
            .string({ message: "Thumbnail is required" })
            .min(1, { message: "Thumbnail is required" }),

        file: z
            .string({ message: "File is required" })
            .min(1, { message: "File is required" }),

        university: z.string().trim().optional(),
        pages: z
            .number({
                message: "Pages must be a number",
            })
            .min(1, { message: "Pages must be at least 1" })
            .max(500, { message: "Pages must be at most 500" })
            .optional(),
        uploadedBy: z.any(),
    })
    .superRefine((data, ctx) => {
        const rule = FILE_TYPE_PRICING[data.fileType];
        if (!rule) return;

        if (data.price < rule.MIN || data.price > rule.MAX) {
            ctx.addIssue({
                path: ["price"],
                code: z.ZodIssueCode.custom,
                message: `For ${data.fileType}, price must be between ₹${rule.MIN} and ₹${rule.MAX}`,
            });
        }
    });


/* =========================================================
   UPDATE NOTE (MESSAGES INCLUDED)
========================================================= */

export const updateNoteSchema = z
    .object({
        title: z
            .string()
            .min(5, { message: "Title must be at least 5 characters" })
            .max(120, { message: "Title must be at most 120 characters" })
            .trim()
            .optional(),

        description: z
            .string()
            .min(20, { message: "Description must be at least 20 characters" })
            .max(500, { message: "Description must be at most 500 characters" })
            .optional(),

        fileType: z.enum(FILE_TYPES).optional(),

        price: z
            .number({ message: "Price must be a number" })
            .optional(),

        university: z.string().trim().optional(),

        pages: z
            .number()
            .min(1, { message: "Pages must be at least 1" })
            .max(500, { message: "Pages must be at most 500" })
            .optional(),
    })
    .superRefine((data, ctx) => {
        if (!data.fileType || data.price === undefined) return;

        const rule = FILE_TYPE_PRICING[data.fileType];

        if (data.price < rule.MIN || data.price > rule.MAX) {
            ctx.addIssue({
                path: ["price"],
                code: z.ZodIssueCode.custom,
                message: `Updated price must be between ₹${rule.MIN} and ₹${rule.MAX}`,
            });
        }
    });