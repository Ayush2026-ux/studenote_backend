import razorpayInstance from "../../config/razorpay";
import { CURRENCY, PLATFORM_FEE_PERCENT } from "../../utils/razorpay.constants";

export const calculateAmount = (price: number) => {
    const rawFee = (price * PLATFORM_FEE_PERCENT) / 100;
    const platformFee = Math.max(1, Math.round(rawFee)); // minimum ₹1
    const totalAmount = price + platformFee;

    return { platformFee, totalAmount };
};

export const generateReceipt = (): string => {
    const ts = Math.floor(Date.now() / 1000);
    const rand = Math.random().toString(36).substring(2, 6);
    return `n${ts}${rand}`;
};

export const createRazorpayOrder = async (
    totalAmountRupees: number,
    receipt: string,
    notes: Record<string, any>
) => {
    return razorpayInstance.orders.create({
        amount: Math.round(totalAmountRupees * 100), // paise
        currency: CURRENCY,
        receipt,
        notes,
    });
};
