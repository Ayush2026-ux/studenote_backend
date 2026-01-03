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

        course: {
            type: String,
            required: true,
            minlength: 2,
        },

        institution: {
            type: String,
            enum: ["COLLEGE", "SCHOOL"],
            required: true,
        },

        year: {
            type: Number,
            min: 1,
            max: 6,
        },

        class: {
            type: String,
        },

        location: {
            type: String,
            required: true,
            minlength: 2,
        },
    },
    { timestamps: true }
);

// Conditional validation
userSchema.pre("validate", function () {
    if (this.institution === "COLLEGE" && !this.year) {
        this.invalidate("year", "Year is required for college");
    }

    if (this.institution === "SCHOOL" && !this.class) {
        this.invalidate("class", "Class is required for school");
    }
});

const User = mongoose.model("User", userSchema);
export default User;
