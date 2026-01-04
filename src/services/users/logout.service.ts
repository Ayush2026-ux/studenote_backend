import User from "../../models/users/users.models";


export const logoutUser = async (userId: string) => {
    const user = await User.findById(userId);

    if (!user) {
        throw new Error("User not found");
    }

    // Invalidate refresh token
    user.set({ refreshToken: null });
    await user.save();

    return true;
};
