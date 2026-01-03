import { registerUser } from "../../services/users/register.service";
import { registerSchema } from "../../validators/register.validator";

export const registerController = async (req: any, res: any) => {

    try {
        const validatedData = registerSchema.parse(req.body);

        const user = await registerUser(validatedData);

        res.status(201).json({
            success: true,
            message: "User registered successfully",
            user,
        });
    } catch (error: any) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};
