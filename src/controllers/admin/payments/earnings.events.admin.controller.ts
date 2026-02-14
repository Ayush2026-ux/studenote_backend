import { Request, Response } from "express";
import earningModel from "../../../models/payments/earning.model";

export const listEarningEvents = async (req: Request, res: Response) => {
    try {
        const { status } = req.query;

        const filter: any = {};
        if (status && status !== "all") {
            filter.status = status; // pending | available | reversed
        }

        const events = await earningModel
            .find(filter)
            .populate("creator", "fullName email")
            .populate("purchase", "amount platformFee totalAmount status")
            .sort({ createdAt: -1 })
            .limit(50);

        return res.json({
            count: events.length,
            status: status || "all",
            events,
            timestamp: new Date(),
        });
    } catch (error) {
        console.error("listEarningEvents error:", error);
        return res.status(500).json({ message: "Failed to fetch earning events" });
    }
};
