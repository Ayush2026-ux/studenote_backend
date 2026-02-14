// controllers/admin/payments/payouts.admin.controller.ts
import { Request, Response } from "express";
import payoutModel from "../../../models/payments/payout.model";
import User from "../../../models/users/users.models";


export const listAllPayouts = async (req: Request, res: Response) => {
    try {
        const { status, method, q } = req.query;
        const filter: any = {};

        if (status && status !== "all") filter.status = status;
        if (method && method !== "all") filter.method = method;

        if (q) {
            const users = await User.find({
                $or: [
                    { fullName: { $regex: q as string, $options: "i" } },
                    { email: { $regex: q as string, $options: "i" } },
                ],
            }).select("_id");

            filter.user = { $in: users.map((u) => u._id) };
        }

        const payouts = await payoutModel
            .find(filter)
            .populate("user", "fullName email upiId bankAccountNumber bankIfsc city")
            .sort({ createdAt: -1 });

        res.json(payouts);
    } catch (err) {
        console.error("listAllPayouts error:", err);
        res.status(500).json({ message: "Failed to fetch payouts" });
    }
};
