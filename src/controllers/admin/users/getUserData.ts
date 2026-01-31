import { Request, Response } from "express";
import User from "../../../models/users/users.models";
import NoteUploads from "../../../models/users/NotesUpload";
import { AuthRequest } from "../../../middlewares/adminAuth.middleware";

// GET /api/admin/users
export const getAllUsers = async (req: AuthRequest, res: Response) => {
    try {
        // Get pagination parameters from query
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const skip = (page - 1) * limit;

        // Validate pagination parameters
        if (page < 1 || limit < 1) {
            return res.status(400).json({
                success: false,
                message: "Page and limit must be positive numbers",
            });
        }

        // Get total count of users (excluding the current admin)
        const totalUsers = await User.countDocuments({
            _id: { $ne: req.user?._id },
        });
        const totalPages = Math.ceil(totalUsers / limit);

        // Fetch paginated users (excluding the current admin)
        const users = await User.find({ _id: { $ne: req.user?._id } })
            .select(
                "-password -otp -otpExpiry -otpAttempts -__v -refreshToken -refreshTokenExpiry"
            )
            .limit(limit)
            .skip(skip)
            .sort({ createdAt: -1 });

        // Transform users to match the desired format
        const transformedUsers = await Promise.all(
            users.map(async (user: any) => {
                // Get notes count for the user
                const notesCount = await NoteUploads.countDocuments({
                    uploadedBy: user._id,
                });

                // Get the date of first approved note (creatorSince)
                const firstNote = await NoteUploads.findOne(
                    { uploadedBy: user._id, status: "approved" },
                    { createdAt: 1 }
                ).sort({ createdAt: 1 });

                // Calculate account age in days
                const createdDate = new Date(user.createdAt);
                const today = new Date();
                const accountAge = Math.floor(
                    (today.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24)
                );

                // Generate avatar initials from fullName
                const avatarInitials = user.fullName
                    .split(" ")
                    .map((name: string) => name.charAt(0).toUpperCase())
                    .join("")
                    .substring(0, 2);

                return {
                    id: user._id.toString(),
                    name: user.fullName,
                    email: user.email,
                    course: "General", // Default course - adjust if users have specific courses
                    joinDate: user.createdAt.toISOString().split("T")[0],
                    status: user.isActive ? "active" : "inactive",
                    avatar: avatarInitials,
                    notes: notesCount,
                    creatorSince: firstNote
                        ? firstNote.createdAt.toISOString().split("T")[0]
                        : null,
                    violations: 0, // Implement violation tracking logic as needed
                    accountAge: accountAge,
                    isAdmin: user.role === "admin", // Mark if user is admin
                };
            })
        );

        return res.status(200).json({
            success: true,
            pagination: {
                page,
                limit,
                totalUsers,
                totalPages,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1,
            },
            users: transformedUsers,
            currentAdmin: {
                id: req.user?._id,
                name: req.user?.fullName,
                email: req.user?.email,
            },
        });
    } catch (error: any) {
        console.error("GET ALL USERS ERROR:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch users",
        });
    }
};
