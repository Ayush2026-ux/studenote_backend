import { OAuth2Client } from "google-auth-library";

export const googleClients = {
    web: new OAuth2Client(process.env.GOOGLE_WEB_CLIENT_ID),
    android: new OAuth2Client(process.env.GOOGLE_ANDROID_CLIENT_ID),
    ios: new OAuth2Client(process.env.GOOGLE_IOS_CLIENT_ID),
};