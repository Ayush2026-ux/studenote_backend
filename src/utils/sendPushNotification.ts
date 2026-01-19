import axios from "axios";

export const sendPushNotification = async ({
    expoPushToken,
    title,
    body,
    data = {},
}: {
    expoPushToken?: string;
    title: string;
    body: string;
    data?: Record<string, any>;
}) => {
    if (!expoPushToken) return;

    try {
        await axios.post("https://exp.host/--/api/v2/push/send", {
            to: expoPushToken,
            sound: "default",
            title,
            body,
            data,
        });
    } catch (err) {
        console.error("PUSH_ERROR:", err);
    }
};
