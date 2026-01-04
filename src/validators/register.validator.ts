import { z } from "zod";

export const registerSchema = z
    .object({
        username: z
            .string()
            .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores")
            .min(3, "Username must be at least 3 characters"),

        fullName: z
            .string()
            .min(3, "Full name must be at least 3 characters"),

        email: z
            .string()
            .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Invalid email address")
            .email("Invalid email address"),


        mobile: z
            .string()
            .regex(/^[6-9]\d{9}$/, "Invalid Indian mobile number"),

        password: z
            .string()
            .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{6,}$/, "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character")
            .min(6, "Password must be at least 6 characters"),
    })

/**
 * Type inference for strong typing
 */
export type RegisterInput = z.infer<typeof registerSchema>;
