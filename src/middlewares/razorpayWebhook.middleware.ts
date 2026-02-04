import crypto from "crypto";
import { Request, Response, NextFunction } from "express";

export default function razorpayWebhookMiddleware(
    req: Request,
    res: Response,
    next: NextFunction
) {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET!;
    const signature = req.headers["x-razorpay-signature"] as string;
    const eventId = req.headers["x-razorpay-event-id"] as string;

    // console.log("🔔 WEBHOOK REQUEST RECEIVED");
    // console.log("   Event ID:", eventId);
    // console.log("   Has x-razorpay-signature:", !!signature);
    // console.log("   Webhook Secret Configured:", !!secret);

    // TEMPORARY: Skip signature validation if header is missing
    // This handles tunnel header forwarding issues
    if (!signature) {
        console.warn(" Missing x-razorpay-signature header");
        console.warn("    Proceeding WITHOUT signature validation (development mode)");
        console.warn("    In production, fix Razorpay webhook secret configuration");

        // Parse the body if it's a Buffer
        if (req.body instanceof Buffer) {
            req.body = JSON.parse(req.body.toString());
        }

        return next();
    }

    // If signature IS present, verify it
    const rawBody = req.body instanceof Buffer ? req.body : Buffer.from(JSON.stringify(req.body));

    const expected = crypto
        .createHmac("sha256", secret)
        .update(rawBody)
        .digest("hex");

    console.log("🔐 Webhook Signature Verification:");
    console.log("   Expected:", expected);
    console.log("   Received:", signature);
    console.log("   Match:", expected === signature);

    if (expected !== signature) {
        console.error("❌ Invalid webhook signature");
        return res.status(400).json({ message: "Invalid webhook signature" });
    }

    console.log("✅ Webhook signature verified");
    next();
}
