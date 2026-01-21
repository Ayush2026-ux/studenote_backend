import User from "../../models/users/users.models";

export const registerUser = async (data: any) => {
  try {
    const user = await User.create({
      username: data.username,
      fullName: data.fullName,
      email: data.email.toLowerCase().trim(),
      mobile: data.mobile,
      password: data.password, // ✅ PLAIN password
      provider: "local",
    });

    return user;
  } catch (err: any) {
    if (err.code === 11000) {
      const field = Object.keys(err.keyValue)[0];
      throw new Error(`${field} already exists`);
    }
    throw new Error(err.message || "Registration failed");
  }
};
