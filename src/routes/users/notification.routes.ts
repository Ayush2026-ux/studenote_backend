import { Router } from "express";
import { authGuard } from "../../middlewares/auth.middleware";
import { getNotifications, getUnreadCount, markAllNotificationsRead, markNotificationRead } from "../../controllers/users/feed/notification.controller";

const router = Router();

/* ================= NOTIFICATIONS ================= */

// list notifications
router.get("/", authGuard, getNotifications);

// unread count
router.get("/unread/count", authGuard, getUnreadCount);

// mark all read
router.patch("/read-all", authGuard, markAllNotificationsRead);

// mark one read
router.patch("/:notificationId/read", authGuard, markNotificationRead);

export default router;
