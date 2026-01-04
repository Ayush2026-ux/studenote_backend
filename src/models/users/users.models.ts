import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
    {
        username: {
            type: String,
            required: true,
            unique: true,
            minlength: 3,
            trim: true,
        },

        fullName: {
            type: String,
            required: true,
            minlength: 3,
            trim: true,
        },

        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },

        mobile: {
            type: String,
            required: true,
            unique: true,
            match: /^[6-9]\d{9}$/,
        },

        password: {
            type: String,
            required: true,
            minlength: 6,
        },

    },
    { timestamps: true }
);



const User = mongoose.model("User", userSchema);
export default User;
