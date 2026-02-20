import { Request, Response } from "express";
import mongoose from "mongoose";
import purchaseModel from "../../../models/payments/purchase.model";
interface AuthRequest extends Request {
    user?: { _id: string };
}
export const getPurchasedNotes = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?._id;   // FIXED

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized: User not logged in",
            });
        }

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid user id",
            });
        }

        const purchases = await purchaseModel
            .find({
                user: userId,
                status: { $in: ["paid", "partially_refunded"] },
            })
            .populate("note", "title file thumbnail description price course")
            .sort({ createdAt: -1 });

        if (!purchases.length) {
            return res.status(200).json({
                success: true,
                message: "No purchased notes found",
                purchasedNotes: [],
            });
        }

        const purchasedNotes = purchases
            .filter((p) => p.note) // safety: in case note deleted
            .map((purchase: any) => ({
                purchaseId: purchase._id,
                noteId: purchase.note._id,
                title: purchase.note.title,
                description: purchase.note.description,
                price: purchase.note.price,
                course: purchase.note.course,
                thumbnail: purchase.note.thumbnail,
                file: purchase.note.file,
                purchasedAt: purchase.createdAt,
                refundStatus: purchase.refundStatus || null,
            }));

        return res.status(200).json({
            success: true,
            message: "Purchased notes fetched successfully",
            purchasedNotes,
        });
    } catch (error: any) {
        console.error("GET_PURCHASED_NOTES_ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Something went wrong while fetching purchased notes",
            error: process.env.NODE_ENV === "development" ? error.message : undefined,
        });
    }
};
