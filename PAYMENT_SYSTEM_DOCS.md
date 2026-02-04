# Payment System - Production Grade Implementation

## Overview
This is a production-grade payment system with Razorpay integration, including full refund management, webhooks, analytics, and audit logging.

## Features Implemented

### 1. **Payment Processing**
- Order creation with automatic fee calculation
- Payment verification with HMAC-SHA256 signature validation
- Transaction status tracking (created, paid, failed)
- MongoDB transactions for atomic operations

### 2. **Refund System**
- Full and partial refunds support
- Automatic refund status tracking
- 30-day refund window policy
- Refund eligibility validation
- Refund reason tracking

### 3. **Webhook Handling**
- Payment failure events
- Refund creation/processing/failure events
- Atomic database updates with transactions
- Comprehensive error handling

### 4. **Analytics & Monitoring**
- Revenue tracking
- Refund rate calculation
- Payment success/failure metrics
- Refund reason analysis
- 30-day analytics window

### 5. **Security & Validation**
- Rate limiting on payment operations
- Purchase ownership validation
- Request payload validation
- Audit logging for all operations
- Signature verification for webhooks

### 6. **Error Handling**
- Try-catch blocks with proper rollback
- Idempotent payment verification
- Transaction rollback on failures
- User-friendly error messages

---

## API Endpoints

### Payment Endpoints

#### 1. Create Order
```
POST /payments/create-order
Authorization: Bearer <token>
Content-Type: application/json

{
  "noteId": "ObjectId"
}

Response:
{
  "orderId": "razorpay_order_id",
  "totalAmount": 1025,
  "platformFee": 25
}
```

#### 2. Verify Payment
```
POST /payments/verify
Authorization: Bearer <token>
Content-Type: application/json

{
  "razorpay_order_id": "order_xxx",
  "razorpay_payment_id": "pay_xxx",
  "razorpay_signature": "signature_xxx"
}

Response:
{
  "success": true,
  "message": "Payment verified successfully"
}
```

### Refund Endpoints

#### 1. Request Refund
```
POST /payments/request-refund
Authorization: Bearer <token>
Content-Type: application/json

{
  "purchaseId": "ObjectId",
  "reason": "Product quality not as expected",
  "refundAmount": 1025  // optional, defaults to full amount
}

Response:
{
  "refundId": "rfnd_xxx",
  "status": "processed",
  "amount": 1025,
  "message": "Refund initiated successfully"
}
```

#### 2. Get Refund Status
```
GET /payments/refund-status/:purchaseId
Authorization: Bearer <token>

Response:
{
  "purchaseId": "ObjectId",
  "status": "refunded",
  "refundStatus": "completed",
  "refundAmount": 1025,
  "refundReason": "Product quality not as expected",
  "refundRequestedAt": "2024-01-31T10:30:00Z",
  "refundCompletedAt": "2024-02-02T15:45:00Z",
  "razorpayRefundId": "rfnd_xxx"
}
```

#### 3. Get Refund Policy
```
GET /payments/refund-policy

Response:
{
  "policy": "30-day money-back guarantee",
  "details": {
    "refundPeriod": "30 days from purchase",
    "refundableAmount": "100% of purchase amount",
    "processingTime": "5-7 business days",
    "restrictions": [
      "Refund only available within 30 days of purchase",
      "Note must not be modified",
      "User must not have downloaded more than 3 times"
    ]
  }
}
```

### Webhook Endpoint

```
POST /payments/webhook
Content-Type: application/json
X-Razorpay-Signature: <signature>

Handles events:
- payment.failed
- refund.created
- refund.processed
- refund.failed
```

---

## Database Schema

### Purchase Model
```typescript
{
  user: ObjectId (ref: User),
  note: ObjectId (ref: NoteUploads),
  
  razorpayOrderId: String (unique),
  razorpayPaymentId: String,
  razorpaySignature: String,
  
  amount: Number,              // Base price
  platformFee: Number,         // 2.5% of amount
  totalAmount: Number,         // amount + platformFee
  
  status: "created" | "paid" | "failed" | "refunded" | "partially_refunded",
  
  refundStatus: "pending" | "processing" | "completed" | "failed",
  razorpayRefundId: String,
  refundAmount: Number,
  refundReason: String,
  refundRequestedAt: Date,
  refundCompletedAt: Date,
  
  createdAt: Date,
  updatedAt: Date
}
```

---

## File Structure

```
src/
├── config/
│   └── razorpay.ts                      # Razorpay configuration
├── controllers/
│   └── users/payments/
│       └── payments.controller.ts       # All payment & refund handlers
├── middlewares/
│   ├── razorpayWebhook.middleware.ts   # Webhook signature verification
│   └── paymentValidation.middleware.ts # Rate limiting, validation, audit log
├── models/
│   └── payments/
│       └── purchase.model.ts            # Purchase schema with refund fields
├── routes/
│   └── payments/
│       └── payment.routes.ts            # All payment routes
├── services/
│   └── payments/
│       ├── razorpay.service.ts         # Razorpay operations
│       ├── refund.service.ts           # Refund business logic
│       └── payment.analytics.ts        # Analytics & metrics
└── utils/
    ├── razorpay.constants.ts           # Payment constants
    └── razorpay.types.ts               # TypeScript types
```

---

## Configuration

### Environment Variables
```env
RAZORPAY_KEY_ID=your_key_id
RAZORPAY_KEY_SECRET=your_key_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret
```

---

## Transaction Flow

### Successful Payment
1. User creates order → Order created with status "created"
2. Payment gateway processes payment
3. User submits signature verification
4. System verifies signature
5. Purchase status → "paid"
6. Downloads incremented
7. Feed score incremented

### Refund Flow
1. User requests refund with reason
2. System validates eligibility (30-day window, status check)
3. Razorpay API called to create refund
4. Purchase status → "refunding"
5. Webhook received with refund status
6. If successful:
   - Status → "refunded" (full) or "partially_refunded"
   - Downloads decremented (if full refund)
   - Feed score decremented (if full refund)
7. If failed:
   - refundStatus → "failed"
   - Manual intervention needed

---

## Error Scenarios & Handling

| Scenario | Handling |
|----------|----------|
| Invalid signature | 400 Bad Request |
| Duplicate payment verification | Returns success (idempotent) |
| Refund outside 30 days | 400 with clear message |
| Unauthorized refund request | 403 Forbidden |
| Payment process failure | Transaction rollback |
| Webhook signature mismatch | 400 Bad Request |
| Rate limit exceeded | 429 Too Many Requests |

---

## Analytics

### Available Metrics
```typescript
interface PaymentMetrics {
  totalRevenue: number;
  totalRefunds: number;
  refundRate: number;
  successfulPayments: number;
  failedPayments: number;
  totalTransactions: number;
}
```

### Usage
```typescript
import { getPaymentMetrics, getRefundAnalytics } from 'services/payments/payment.analytics';

const metrics = await getPaymentMetrics();
const analytics = await getRefundAnalytics(30); // Last 30 days
```

---

## Security Best Practices

✅ HMAC signature verification on all Razorpay requests
✅ Transaction-based database operations
✅ Rate limiting on sensitive endpoints
✅ Audit logging for all payment operations
✅ Purchase ownership validation
✅ Input validation on all requests
✅ Error handling without exposing sensitive info
✅ Webhook signature verification

---

## Future Enhancements

- [ ] Partial refunds with inventory management
- [ ] Refund auto-approval/rejection based on rules
- [ ] Payment retry mechanism for failed payments
- [ ] Invoice generation and storage
- [ ] Tax calculation by region
- [ ] Multi-currency support
- [ ] Subscription/recurring payments
- [ ] Payment method management
- [ ] Fraud detection system
- [ ] PCI DSS compliance reporting

---

## Testing Recommendations

1. **Unit Tests**: Test each service function independently
2. **Integration Tests**: Test complete payment flow
3. **Webhook Tests**: Test various webhook scenarios
4. **Rate Limit Tests**: Verify rate limiting works
5. **Transaction Tests**: Verify rollback on errors
6. **Load Tests**: Test under high traffic

---

## Monitoring & Alerts

Recommended alerts:
- Failed payment attempts (> 5 in 1 hour)
- High refund rate (> 10%)
- Webhook failures
- Database transaction errors
- Rate limit triggers

---

## Support & Troubleshooting

### Common Issues

**Issue**: Signature mismatch
- Solution: Verify RAZORPAY_KEY_SECRET is correct in .env

**Issue**: Webhook not being called
- Solution: Verify webhook URL is correctly configured in Razorpay dashboard

**Issue**: Refund failing
- Solution: Check Razorpay account has sufficient balance

---

**Last Updated**: January 31, 2026
**Version**: 1.0.0 Production Release
