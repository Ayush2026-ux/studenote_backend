import { Router } from "express";
import { authGuard } from "../../middlewares/auth.middleware";
import {
    createOrder,
    verifyPayment,
    getNotes,
} from "../../controllers/users/payments/payments.controller";
import {
    paymentRateLimit,
    validateRefundPayload,
    paymentAuditLog,
} from "../../middlewares/paymentValidation.middleware";

const router = Router();

// User payment actions
router.post(
    "/create-order",
    authGuard,
    paymentRateLimit,
    paymentAuditLog,
    createOrder as any
);

router.post(
    "/verify-signature",
    authGuard,
    paymentRateLimit,
    verifyPayment as any
);

// // Refunds
// router.post(
//     "/request-refund",
//     authGuard,
//     validateRefundPayload,
//     paymentAuditLog,
//     requestRefundHandler as any
// );

// router.get(
//     "/refund-status/:purchaseId",
//     authGuard,
//     paymentAuditLog,
//     getRefundStatusHandler as any
// );

router.get("/is-purchased/:noteId", authGuard, getNotes as any);

// router.get("/refund-policy", authGuard, getRefundPolicyHandler as any);

export default router;
