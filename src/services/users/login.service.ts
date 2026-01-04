import bcrypt from "bcrypt";
import { generateAccessToken, generateRefreshToken } from "../../utils/jwt";
import User from "../../models/users/users.models";

export const loginUser = async (email: string, password: string) => {
    const user = await User
        .findOne({ email: email.toLowerCase() })
        .select("+password");



    if (!user) {
        throw new Error("Invalid email or password");
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
        throw new Error("Invalid email or password");
    }

    const payload = { userId: user._id.toString() };

    return {
        accessToken: generateAccessToken(payload),
        refreshToken: generateRefreshToken(payload),
        user: {
            id: user._id.toString(),
            username: user.username,
            email: user.email,
        },
    };
};
