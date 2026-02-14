import Razorpay from "razorpay";

const razorpayInstance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || "",
    key_secret: process.env.RAZORPAY_KEY_SECRET || "",
});

//  Cast to any to allow payouts typing
export default razorpayInstance as any;
