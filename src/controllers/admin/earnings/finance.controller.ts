// controllers/admin/finance.controller.ts
import { Request, Response } from "express";
import purchaseModel from "../../../models/payments/purchase.model";
import earningModel from "../../../models/payments/earning.model";
import payoutModel from "../../../models/payments/payout.model";


export const getFinanceSummary = async (req: Request, res: Response) => {
    try {
        const [
            totalRevenueAgg,
            creatorEarningsAgg,
            pendingPayoutsAgg,
            platformCommissionAgg,
        ] = await Promise.all([
            purchaseModel.aggregate([{ $match: { status: "paid" } }, { $group: { _id: null, total: { $sum: "$totalAmount" } } }]),
            earningModel.aggregate([{ $group: { _id: null, total: { $sum: "$netAmount" } } }]),
            payoutModel.aggregate([{ $match: { status: "requested" } }, { $group: { _id: null, total: { $sum: "$netAmount" } } }]),
            purchaseModel.aggregate([{ $match: { status: "paid" } }, { $group: { _id: null, total: { $sum: "$platformFee" } } }]),
        ]);

        // console.log("Finance Summary:", {
        //     totalRevenue: totalRevenueAgg[0]?.total || 0,
        //     creatorEarnings: creatorEarningsAgg[0]?.total || 0,
        //     pendingPayouts: pendingPayoutsAgg[0]?.total || 0,
        //     platformCommission: platformCommissionAgg[0]?.total || 0,
        // });
        res.json({
            success: true,
            data: {
                totalRevenue: totalRevenueAgg[0]?.total || 0,
                creatorEarnings: creatorEarningsAgg[0]?.total || 0,
                pendingPayouts: pendingPayoutsAgg[0]?.total || 0,
                platformCommission: platformCommissionAgg[0]?.total || 0,
            },
        });
    } catch (e) {
        console.error("Finance summary error:", e);
        res.status(500).json({ success: false, message: "Finance summary failed" });
    }
};


export const listTransactions = async (req: Request, res: Response) => {
    try {
        const page = Number(req.query.page || 1);
        const limit = 10;
        const skip = (page - 1) * limit;

        const [data, total] = await Promise.all([
            purchaseModel
                .find({ status: "paid" })
                .populate("user", "fullName email")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),

            purchaseModel.countDocuments({ status: "paid" }),
        ]);

        res.json({
            success: true,
            data,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (err) {
        console.error("listTransactions error:", err);
        res.status(500).json({ success: false, message: "Failed to fetch transactions" });
    }
};


export const listPayoutRequests = async (req: Request, res: Response) => {
    const status = req.query.status;

    const filter: any = {};
    if (status && status !== "all") filter.status = status;

    const payouts = await payoutModel.find(filter)
        .populate("user", "fullName email")
        .sort({ createdAt: -1 });

    res.json({ success: true, data: payouts });
};


export const approvePayout = async (req: Request, res: Response) => {
    const { payoutId } = req.params;

    const payout = await payoutModel.findByIdAndUpdate(
        payoutId,
        { status: "approved", approvedAt: new Date(), approvedBy: (req as any).user._id },
        { new: true }
    );

    res.json({ success: true, payout });
};

export const rejectPayout = async (req: Request, res: Response) => {
    const { payoutId } = req.params;
    const { reason } = req.body;

    const payout = await payoutModel.findByIdAndUpdate(
        payoutId,
        { status: "rejected", rejectedReason: reason },
        { new: true }
    );

    res.json({ success: true, payout });
};

export const revenueAnalytics = async (req: Request, res: Response) => {
    try {
        const { startDate, endDate } = req.query;

        const match: any = { status: "paid" };

        if (startDate && endDate) {
            match.createdAt = {
                $gte: new Date(startDate as string),
                $lte: new Date(endDate as string),
            };
        }

        const data = await purchaseModel.aggregate([
            { $match: match },
            {
                $group: {
                    _id: {
                        $dateToString: { format: "%d %b", date: "$createdAt" },
                    },
                    revenue: { $sum: "$totalAmount" },
                },
            },
            { $sort: { _id: 1 } },
        ]);

        // console.log("Revenue analytics:", data);

        res.json({ success: true, data });
    } catch (error) {
        console.error("Revenue analytics error:", error);
        res.status(500).json({ success: false, message: "Revenue analytics failed" });
    }
};