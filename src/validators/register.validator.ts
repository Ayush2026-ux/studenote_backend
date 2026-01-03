import { z } from "zod";

export const registerSchema = z
    .object({
        username: z
            .string()
            .min(3, "Username must be at least 3 characters"),

        fullName: z
            .string()
            .min(3, "Full name must be at least 3 characters"),

        email: z
            .string()
            .email("Invalid email address"),

        mobile: z
            .string()
            .regex(/^[6-9]\d{9}$/, "Invalid Indian mobile number"),

        password: z
            .string()
            .min(6, "Password must be at least 6 characters"),

        course: z
            .string()
            .min(2, "Course is required"),

        institution: z.enum(["COLLEGE", "SCHOOL"]),

        year: z
            .number()
            .int()
            .min(1)
            .max(6)
            .optional(),

        class: z
            .string()
            .optional(),

        location: z
            .string()
            .min(2, "Location is required"),
    })
    .superRefine((data, ctx) => {
        // College rule
        if (data.institution === "COLLEGE" && !data.year) {
            ctx.addIssue({
                path: ["year"],
                message: "Year is required for college",
                code: z.ZodIssueCode.custom,
            });
        }

        // School rule
        if (data.institution === "SCHOOL" && !data.class) {
            ctx.addIssue({
                path: ["class"],
                message: "Class is required for school",
                code: z.ZodIssueCode.custom,
            });
        }
    });

/**
 * Type inference for strong typing
 */
export type RegisterInput = z.infer<typeof registerSchema>;
