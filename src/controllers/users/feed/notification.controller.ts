import { Request, Response } from "express";
import Notification from "../../../models/users/notification.models";

/* ======================================================
   GET USER NOTIFICATIONS (PAGINATED)
====================================================== */

export const getNotifications = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        // 🔥 disable cache
        res.set("Cache-Control", "no-store");

        const notifications = await Notification.find({ recipient: userId })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate("sender", "username avatar")
            .populate("feed", "note")
            .lean();

        res.json({
            success: true,
            page,
            notifications,
        });
    } catch (error) {
        console.error("GET_NOTIFICATIONS_ERROR:", error);
        res.status(500).json({
            success: false,
            message: "Unable to fetch notifications",
        });
    }
};

/* ======================================================
   MARK SINGLE NOTIFICATION AS READ
====================================================== */

export const markNotificationRead = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const { notificationId } = req.params;

        await Notification.updateOne(
            { _id: notificationId, recipient: userId },
            { isRead: true }
        );

        res.json({ success: true });
    } catch (error) {
        console.error("MARK_NOTIFICATION_READ_ERROR:", error);
        res.status(500).json({
            success: false,
            message: "Unable to update notification",
        });
    }
};

/* ======================================================
   MARK ALL NOTIFICATIONS AS READ
====================================================== */

export const markAllNotificationsRead = async (
    req: Request,
    res: Response
) => {
    try {
        const userId = (req as any).user.id;

        await Notification.updateMany(
            { recipient: userId, isRead: false },
            { isRead: true }
        );

        res.json({ success: true });
    } catch (error) {
        console.error("MARK_ALL_NOTIFICATIONS_ERROR:", error);
        res.status(500).json({
            success: false,
            message: "Unable to update notifications",
        });
    }
};

/* ======================================================
   GET UNREAD COUNT (🔥 FIXED)
====================================================== */

export const getUnreadCount = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;

        // 🔥 PREVENT 304 / CACHE
        res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
        res.set("Pragma", "no-cache");
        res.set("Expires", "0");

        const count = await Notification.countDocuments({
            recipient: userId,
            isRead: false,
        });

        res.json({
            success: true,
            unread: count,
        });
    } catch (error) {
        console.error("GET_UNREAD_COUNT_ERROR:", error);
        res.status(500).json({
            success: false,
            message: "Unable to fetch unread count",
        });
    }
};
