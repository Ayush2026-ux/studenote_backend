import { Request, Response } from "express";
import { registerUser } from "../../services/users/register.service";
import { registerSchema } from "../../validators/register.validator";
import { sendWelcomeMail } from "../../services/mail/welcome.mail";

export const registerController = async (req: Request, res: Response) => {
  try {
    // 1️⃣ Validate request body using Zod
    const validatedData = registerSchema.parse(req.body);

    // 2️⃣ Save user to database
    const user = await registerUser(validatedData);

    // 3️⃣ Send welcome email (NON-BLOCKING)
    sendWelcomeMail(user.email, user.fullName).catch((err) => {
      console.error("WELCOME MAIL ERROR:", err);
    });

    // 4️⃣ Send success response
    return res.status(201).json({
      success: true,
      message: "User registered successfully",
      user: {
        id: user._id,
        username: user.username,
        fullName: user.fullName,
        email: user.email,
        mobile: user.mobile,
      },
    });
  } catch (error: any) {
    console.error("REGISTER CONTROLLER ERROR:", error);

    return res.status(400).json({
      success: false,
      message:
        error?.errors?.[0]?.message || // Zod validation error
        error?.message ||
        "Registration failed",
    });
  }
};
