// users/payments/payments.controller.ts

import crypto from "crypto";
import { Request, Response } from "express";
import NotesUpload from "../../../models/users/NotesUpload";
import User from "../../../models/users/users.models";
import {
  calculateAmount,
  createRazorpayOrder,
  generateReceipt,
} from "../../../services/payments/razorpay.service";
import purchaseModel from "../../../models/payments/purchase.model";
import { sendPurchaseConfirmationEmail } from "../../../services/mail/sendPurchaseConfirmationEmail";

interface AuthRequest extends Request {
  user: { _id: string };
}

/* ================= CREATE ORDER ================= */

export const createOrder = async (req: AuthRequest, res: Response) => {
  try {
    const { noteId } = req.body;
    const userId = req.user._id;

    const note = await NotesUpload.findById(noteId);
    if (!note || note.status !== "approved") {
      return res.status(400).json({ message: "Note not available" });
    }

    /* 🔥 STEP 1: Expire old created orders (older than 15 mins) */

    await purchaseModel.updateMany(
      {
        user: userId,
        note: noteId,
        status: "created",
        createdAt: { $lt: new Date(Date.now() - 15 * 60 * 1000) },
      },
      { status: "expired" }
    );

    /* 🔥 STEP 2: Block if already paid */

    const alreadyPaid = await purchaseModel.findOne({
      user: userId,
      note: noteId,
      status: { $in: ["paid", "partially_refunded"] },
    });

    if (alreadyPaid) {
      return res.status(400).json({
        message: "You have already purchased this note",
        status: "already_purchased",
      });
    }

    /* 🔥 STEP 3: Reuse existing active created order */

    const existingCreated = await purchaseModel.findOne({
      user: userId,
      note: noteId,
      status: "created",
    });

    if (existingCreated) {
      return res.json({
        orderId: existingCreated.razorpayOrderId,
        amount: existingCreated.amount,
        platformFee: existingCreated.platformFee,
        totalAmount: existingCreated.totalAmount,
      });
    }

    /* 🔥 STEP 4: Create new order */

    const { platformFee, totalAmount } = calculateAmount(note.price);
    const receipt = generateReceipt();

    const order = await createRazorpayOrder(totalAmount, receipt, {
      noteId: noteId.toString(),
      userId: userId.toString(),
      platformFee,
    });

    await purchaseModel.create({
      user: userId,
      note: noteId,
      razorpayOrderId: order.id,
      amount: note.price,
      platformFee,
      totalAmount,
      status: "created",
    });

    res.json({
      orderId: order.id,
      amount: note.price,
      platformFee,
      totalAmount,
    });
  } catch (error: any) {
    console.error("Create order error:", error);
    res.status(500).json({ message: "Failed to create order" });
  }
};

/* ================= VERIFY PAYMENT ================= */

export const verifyPayment = async (req: AuthRequest, res: Response) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

    const expected = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expected !== razorpay_signature) {
      return res.status(400).json({ message: "Invalid signature" });
    }

    const purchase = await purchaseModel.findOne({
      razorpayOrderId: razorpay_order_id,
    });

    if (!purchase) {
      return res.status(404).json({ message: "Purchase record not found" });
    }

    /* 🔥 Prevent double verification */
    if (purchase.status === "paid") {
      return res.json({ success: true });
    }

    purchase.razorpayPaymentId = razorpay_payment_id;
    purchase.status = "paid";
    await purchase.save();

    const user = await User.findById(purchase.user);
    const note = await NotesUpload.findById(purchase.note).populate(
      "uploadedBy",
      "fullName"
    );

    if (user && note) {
      sendPurchaseConfirmationEmail({
        to: user.email,
        userName: user.fullName,
        noteName: note.title,
        noteAuthor: (note.uploadedBy as any)?.fullName || "Unknown",
        amount: purchase.amount,
        platformFee: purchase.platformFee,
        totalAmount: purchase.totalAmount,
        purchaseDate: new Date(),
        purchaseId: purchase._id.toString(),
      }).catch(console.error);
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Verify payment error:", error);
    res.status(500).json({ message: "Failed to verify payment" });
  }
};

/* ================= GET NOTES ================= */

export const getNotes = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    const notes = await NotesUpload.find({ status: "approved" });

    const notesWithPurchaseStatus = await Promise.all(
      notes.map(async (note) => {
        let isBought = false;

        if (userId) {
          const purchase = await purchaseModel.findOne({
            user: userId,
            note: note._id,
            status: "paid",
          });
          isBought = !!purchase;
        }

        return {
          ...note.toObject(),
          isBought,
        };
      })
    );

    res.json(notesWithPurchaseStatus);
  } catch (error) {
    console.error("Get notes error:", error);
    res.status(500).json({ message: "Failed to fetch notes" });
  }
};