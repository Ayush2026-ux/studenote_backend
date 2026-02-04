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
import {
    requestRefund,
    getRefundStatus,
    getRefundPolicy,
} from "../../../services/payments/refund.service";
import { sendPurchaseConfirmationEmail } from "../../../services/mail/sendPurchaseConfirmationEmail";

interface AuthRequest extends Request {
    user: { _id: string };
}

/**
 * CREATE ORDER
 * - Creates Razorpay order
 * - Creates DB entry with 'created' status
 */
export const createOrder = async (req: AuthRequest, res: Response) => {
    try {
        const { noteId } = req.body;
        const userId = req.user._id;

        const note = await NotesUpload.findById(noteId);
        if (!note || note.status !== "approved") {
            return res.status(400).json({ message: "Note not available" });
        }

        // Prevent repurchase
        const alreadyPurchased = await purchaseModel.findOne({
            user: userId,
            note: noteId,
            status: "paid",
        });

        if (alreadyPurchased) {
            return res.status(400).json({
                message: "You have already purchased this note",
                status: "already_purchased",
            });
        }

        const { platformFee, totalAmount } = calculateAmount(note.price);
        const receipt = generateReceipt();

        const order = await createRazorpayOrder(totalAmount, receipt, {
            noteId: noteId.toString(),
            userId: userId.toString(),
            platformFee,
        });

        // Create purchase record in database
        const purchase = new purchaseModel({
            user: userId,
            note: noteId,
            razorpayOrderId: order.id,
            amount: note.price,
            platformFee,
            totalAmount,
            status: "created",
        });

        await purchase.save();

        res.json({
            orderId: order.id,
            amount: note.price,
            platformFee,
            totalAmount,
        });
    } catch (error) {
        console.error("Create order error:", error);
        res.status(500).json({ message: "Failed to create order" });
    }
};

/**
 * VERIFY PAYMENT
 * - Verifies signature
 * - Updates DB with payment confirmation
 * - Sends confirmation email to user
 */
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

        // Find the purchase record by Razorpay order ID
        const purchase = await purchaseModel.findOne({
            razorpayOrderId: razorpay_order_id,
        });

        if (!purchase) {
            return res.status(404).json({ message: "Purchase record not found" });
        }

        // Update purchase with payment details
        purchase.razorpayPaymentId = razorpay_payment_id;
        purchase.razorpaySignature = razorpay_signature;
        purchase.status = "paid";
        await purchase.save();

        // Fetch user and note details for email
        const user = await User.findById(purchase.user);
        const note = await NotesUpload.findById(purchase.note).populate(
            "uploadedBy",
            "fullName"
        );

        if (user && note) {
            try {
                await sendPurchaseConfirmationEmail({
                    to: user.email,
                    userName: user.fullName,
                    noteName: note.title,
                    noteAuthor: (note.uploadedBy as any)?.fullName || "Unknown",
                    amount: purchase.amount,
                    platformFee: purchase.platformFee,
                    totalAmount: purchase.totalAmount,
                    purchaseDate: new Date(),
                    purchaseId: purchase._id.toString(),
                });
            } catch (emailError) {
                console.error("Failed to send confirmation email:", emailError);
                // Don't fail the entire request if email fails
            }
        }

        res.json({ success: true });
    } catch (error) {
        console.error("Verify payment error:", error);
        res.status(500).json({ message: "Failed to verify payment" });
    }
};

/* ================= REFUNDS ================= */

export const requestRefundHandler = async (req: AuthRequest, res: Response) => {
    try {
        const { purchaseId, reason, refundAmount } = req.body;
        const userId = req.user._id;

        if (!purchaseId || !reason) {
            return res
                .status(400)
                .json({ message: "purchaseId and reason are required" });
        }

        const refundResult = await requestRefund(userId, {
            purchaseId,
            reason,
            refundAmount,
        });

        res.json(refundResult);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};

export const getRefundStatusHandler = async (
    req: AuthRequest,
    res: Response
) => {
    const { purchaseId } = req.params;
    const userId = req.user._id;
    const status = await getRefundStatus(userId, purchaseId);
    res.json(status);
};

export const getRefundPolicyHandler = async (_: Request, res: Response) => {
    res.json(getRefundPolicy());
};


// In your notes fetch endpoint
export const getNotes = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?._id;
        const notes = await NotesUpload.find({ status: "approved" });

        // Add isBought flag for authenticated users
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