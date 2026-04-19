import razorpayInstance from "../../config/razorpay";
import { CURRENCY, PLATFORM_FEE_PERCENT } from "../../utils/razorpay.constants";

/* ================= CALCULATE AMOUNT ================= */

export const calculateAmount = (price: number) => {
  const safePrice = Number(price);

  // ✅ FIX 1: safe price check
  if (!safePrice || isNaN(safePrice)) {
    throw new Error("Invalid price received in calculateAmount");
  }

  const rawFee = (safePrice * PLATFORM_FEE_PERCENT) / 100;
  const platformFee = Math.max(1, Math.round(rawFee)); // minimum ₹1
  const totalAmount = safePrice + platformFee;

  // ✅ DEBUG
  console.log("PRICE:", safePrice);
  console.log("PLATFORM FEE:", platformFee);
  console.log("TOTAL AMOUNT:", totalAmount);

  return { platformFee, totalAmount };
};

/* ================= GENERATE RECEIPT ================= */

export const generateReceipt = (): string => {
  const ts = Math.floor(Date.now() / 1000);
  const rand = Math.random().toString(36).substring(2, 6);

  return `n${ts}${rand}`;
};

/* ================= CREATE RAZORPAY ORDER ================= */

export const createRazorpayOrder = async (
  totalAmountRupees: number,
  receipt: string,
  notes: Record<string, any>
) => {
  try {
    const safeAmount = Number(totalAmountRupees);

    // ✅ FIX 2: amount validation
    if (!safeAmount || isNaN(safeAmount)) {
      throw new Error("Invalid total amount for Razorpay");
    }

    const amountInPaise = Math.round(safeAmount * 100);

    // ✅ DEBUG
    console.log("RAZORPAY AMOUNT (₹):", safeAmount);
    console.log("RAZORPAY AMOUNT (paise):", amountInPaise);
    console.log("RECEIPT:", receipt);
    console.log("NOTES:", notes);

    const order = await razorpayInstance.orders.create({
      amount: amountInPaise, // 🔥 important
      currency: CURRENCY,
      receipt,
      notes,
    });

    console.log("✅ ORDER CREATED:", order.id);

    return order;

  } catch (error: any) {
    console.error("❌ RAZORPAY ORDER ERROR:", error);

    throw new Error(
      error?.error?.description || error?.message || "Razorpay order failed"
    );
  }
};