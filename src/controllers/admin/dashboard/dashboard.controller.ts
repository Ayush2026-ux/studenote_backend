import { Request, Response } from "express";
import Purchase from "../../../models/payments/purchase.model";
import Earning from "../../../models/payments/earning.model";
import Payout from "../../../models/payments/payout.model";
import NoteUploads from "../../../models/users/NotesUpload";
import User from "../../../models/users/users.models";

/* ================= DASHBOARD STATS ================= */
export const getAdminStats = async (req: Request, res: Response) => {
    try {
        const [
            totalUsers,
            activeCreators,
            pendingNotes,
            totalNotesToday,
            totalRevenueAgg,
            dailyActiveStudents,
        ] = await Promise.all([
            User.countDocuments({}),
            NoteUploads.distinct("uploadedBy").then((x) => x.length),
            NoteUploads.countDocuments({ status: "pending" }),
            NoteUploads.countDocuments({
                createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
            }),
            Purchase.aggregate([
                { $match: { status: "paid" } },
                { $group: { _id: null, total: { $sum: "$totalAmount" } } },
            ]),
            Purchase.distinct("user").then((x) => x.length),
        ]);

        res.json({
            success: true,
            data: {
                totalUsers,
                activeCreators,
                pendingNotes,
                totalNotesToday,
                totalRevenue: totalRevenueAgg[0]?.total || 0,
                dailyActiveStudents,
            },
        });
    } catch (e) {
        console.error("getAdminStats error:", e);
        res.status(500).json({ success: false, message: "Failed to load stats" });
    }
};

/* ================= LINE CHART DATA ================= */
export const getGrowthTrends = async (req: Request, res: Response) => {
    try {
        const data = await Purchase.aggregate([
            { $match: { status: "paid" } },
            {
                $group: {
                    _id: {
                        $dateToString: { format: "%b %d", date: "$createdAt" },
                    },
                    revenue: { $sum: "$totalAmount" },
                    users: { $addToSet: "$user" },
                },
            },
            {
                $project: {
                    _id: 0,
                    date: "$_id",
                    revenue: 1,
                    users: { $size: "$users" },
                },
            },
            { $sort: { date: 1 } },
        ]);

        res.json({ success: true, data });
    } catch (e) {
        res.status(500).json({ success: false, message: "Failed to load trends" });
    }
};

/* ================= PIE CHART ================= */
export const getRevenueByCategory = async (req: Request, res: Response) => {
    try {
        const data = await Purchase.aggregate([
            { $match: { status: "paid" } },
            {
                $lookup: {
                    from: "noteuploads",
                    localField: "note",
                    foreignField: "_id",
                    as: "note",
                },
            },
            { $unwind: "$note" },
            {
                $group: {
                    _id: "$note.course",
                    value: { $sum: "$totalAmount" },
                },
            },
            {
                $project: {
                    _id: 0,
                    name: "$_id",
                    value: 1,
                },
            },
            { $sort: { value: -1 } },
        ]);

        res.json({ success: true, data });
    } catch (e) {
        res.status(500).json({ success: false, message: "Failed to load category revenue" });
    }
};
