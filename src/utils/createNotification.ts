import axios from "axios";

export const sendPushNotification = async ({
    expoPushToken,
    title,
    body,
    data = {},
}: {
    expoPushToken?: string | null; // ✅ allow null
    title: string;
    body: string;
    data?: Record<string, any>;
}) => {
    // 🔒 Guard
    if (!expoPushToken) return;

    try {
        await axios.post("https://exp.host/--/api/v2/push/send", {
            to: expoPushToken,
            sound: "default",
            title,
            body,
            data,
        });
    } catch (error) {
        console.error("PUSH_NOTIFICATION_ERROR:", error);
    }
};
