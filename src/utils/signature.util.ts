import crypto from "crypto";

export const verifyRazorpaySignature = (
    orderId: string,
    paymentId: string,
    signature: string
) => {
    const expected = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
        .update(orderId + "|" + paymentId)
        .digest("hex");

    return expected === signature;
};
