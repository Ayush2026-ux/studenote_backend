import bcrypt from "bcrypt";
import User from "../../models/users/users.models";

export const registerUser = async (data: any) => {
    try {
        const hashedPassword = await bcrypt.hash(data.password, 10);

        const user = await User.create({
            username: data.username,
            fullName: data.fullName,
            email: data.email,
            mobile: data.mobile,
            password: hashedPassword,
        });


        return user;
    } catch (err: any) {
        // MongoDB duplicate key error
        if (err.code === 11000) {
            const field = Object.keys(err.keyValue)[0];
            throw new Error(`${field} already exists`);
        }

        throw new Error(err.message || "Registration failed");
    }
};
