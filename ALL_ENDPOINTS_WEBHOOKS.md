# Complete Payment System - All Routes & Webhooks

## 📋 Table of Contents
1. [User Payment Routes](#user-payment-routes)
2. [Admin Refund Routes](#admin-refund-routes)
3. [Webhook Events](#webhook-events)
4. [Webhook Payloads](#webhook-payloads)
5. [Environment Variables](#environment-variables)
6. [Frontend Integration](#frontend-integration)

---

## User Payment Routes

### Base URL
```
http://localhost:4000/api/payments
```

### 1. Create Order
**Endpoint:** `POST /create-order`

**Authentication:** Required (Bearer Token)

**Rate Limit:** 5 requests per minute

**Request:**
```json
{
  "noteId": "507f1f77bcf86cd799439011"
}
```

**Response (Success):**
```json
{
  "orderId": "order_1234567890abcdef",
  "totalAmount": 1025,
  "platformFee": 25
}
```

**Response (Error):**
```json
{
  "message": "Note not available"
}
```

**cURL:**
```bash
curl -X POST http://localhost:4000/api/payments/create-order \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"noteId": "507f1f77bcf86cd799439011"}'
```

---

### 2. Verify Payment
**Endpoint:** `POST /verify`

**Authentication:** Required (Bearer Token)

**Rate Limit:** 5 requests per minute

**Request:**
```json
{
  "razorpay_order_id": "order_1234567890abcdef",
  "razorpay_payment_id": "pay_1234567890abcdef",
  "razorpay_signature": "9ef4dffbfd84f1318f6739a3ce19f9d85851857ae648f114332d8401e0949a3d"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Payment verified successfully"
}
```

**Response (Error):**
```json
{
  "message": "Invalid signature"
}
```

**cURL:**
```bash
curl -X POST http://localhost:4000/api/payments/verify \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "razorpay_order_id": "order_xxx",
    "razorpay_payment_id": "pay_xxx",
    "razorpay_signature": "signature_xxx"
  }'
```

---

### 3. Request Refund
**Endpoint:** `POST /request-refund`

**Authentication:** Required (Bearer Token)

**Rate Limit:** 5 requests per minute

**Validation:**
- `purchaseId`: Required, valid MongoDB ObjectId
- `reason`: Required, minimum 10 characters
- `refundAmount`: Optional, number type

**Request:**
```json
{
  "purchaseId": "507f1f77bcf86cd799439011",
  "reason": "The content does not match the description provided",
  "refundAmount": 1025
}
```

**Response (Success):**
```json
{
  "refundId": "rfnd_1234567890abcdef",
  "status": "processed",
  "amount": 1025,
  "message": "Refund initiated successfully"
}
```

**Response (Validation Error):**
```json
{
  "message": "Reason must be at least 10 characters long"
}
```

**Response (Business Logic Error):**
```json
{
  "message": "Can only refund paid purchases"
}
```

**cURL:**
```bash
curl -X POST http://localhost:4000/api/payments/request-refund \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "purchaseId": "507f1f77bcf86cd799439011",
    "reason": "The content does not match the description provided"
  }'
```

---

### 4. Get Refund Status
**Endpoint:** `GET /refund-status/:purchaseId`

**Authentication:** Required (Bearer Token)

**Parameters:**
- `purchaseId`: Purchase ID in URL path

**Response (Success):**
```json
{
  "purchaseId": "507f1f77bcf86cd799439011",
  "status": "refunded",
  "refundStatus": "completed",
  "refundAmount": 1025,
  "refundReason": "The content does not match the description provided",
  "refundRequestedAt": "2024-01-31T10:30:00Z",
  "refundCompletedAt": "2024-02-04T15:45:00Z",
  "razorpayRefundId": "rfnd_1234567890abcdef"
}
```

**Response (Not Found):**
```json
{
  "message": "Purchase not found"
}
```

**cURL:**
```bash
curl -X GET http://localhost:4000/api/payments/refund-status/507f1f77bcf86cd799439011 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### 5. Get Refund Policy
**Endpoint:** `GET /refund-policy`

**Authentication:** Not Required

**Response:**
```json
{
  "policy": "30-day money-back guarantee",
  "details": {
    "refundPeriod": "30 days from purchase",
    "refundableAmount": "100% of purchase amount",
    "processingTime": "7-8 working days",
    "restrictions": [
      "Refund only available within 30 days of purchase",
      "Note must not be modified",
      "User must not have downloaded more than 3 times"
    ]
  }
}
```

**cURL:**
```bash
curl -X GET http://localhost:4000/api/payments/refund-policy
```

---

## Admin Refund Routes

### Base URL
```
http://localhost:4000/api/admin/refunds
```

### 1. Get Refund Statistics
**Endpoint:** `GET /stats`

**Authentication:** Required (Admin Bearer Token)

**Response:**
```json
{
  "summary": [
    {
      "_id": "processing",
      "count": 5,
      "totalAmount": 5125
    },
    {
      "_id": "completed",
      "count": 23,
      "totalAmount": 23575
    },
    {
      "_id": "failed",
      "count": 2,
      "totalAmount": 2050
    }
  ],
  "timeline": [
    {
      "purchaseId": "507f1f77bcf86cd799439011",
      "userId": "507f1f77bcf86cd799439012",
      "refundAmount": 1025,
      "businessDaysElapsed": 3,
      "status": "processing",
      "requestedAt": "2024-01-31T10:30:00Z"
    }
  ],
  "timestamp": "2024-02-03T12:00:00Z"
}
```

**cURL:**
```bash
curl -X GET http://localhost:4000/api/admin/refunds/stats \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

---

### 2. Get Near Completion Refunds
**Endpoint:** `GET /near-completion`

**Authentication:** Required (Admin Bearer Token)

**Response:**
```json
{
  "count": 2,
  "refunds": [
    {
      "purchaseId": "507f1f77bcf86cd799439011",
      "refundedAmount": 1025,
      "userId": "507f1f77bcf86cd799439012",
      "businessDaysElapsed": 6,
      "expectedCompletionDays": 2,
      "refundRequestedAt": "2024-01-25T10:30:00Z"
    }
  ],
  "timestamp": "2024-02-03T12:00:00Z"
}
```

**cURL:**
```bash
curl -X GET http://localhost:4000/api/admin/refunds/near-completion \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

---

### 3. Get Scheduler Status
**Endpoint:** `GET /scheduler-status`

**Authentication:** Required (Admin Bearer Token)

**Response:**
```json
{
  "isRunning": true,
  "interval": "Every 6 hours",
  "lastCheck": "2024-02-03T12:00:00Z"
}
```

**cURL:**
```bash
curl -X GET http://localhost:4000/api/admin/refunds/scheduler-status \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

---

### 4. Manual Refund Processing
**Endpoint:** `POST /manual-process`

**Authentication:** Required (Admin Bearer Token)

**Request:** No body required

**Response:**
```json
{
  "message": "Manual refund processing triggered",
  "result": {
    "processing": {
      "processedCount": 3,
      "failedCount": 0,
      "timestamp": "2024-02-03T12:00:00Z"
    },
    "nearCompletion": [...]
  }
}
```

**cURL:**
```bash
curl -X POST http://localhost:4000/api/admin/refunds/manual-process \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json"
```

---

### 5. Force Refund Processing
**Endpoint:** `POST /force-process`

**Authentication:** Required (Admin Bearer Token)

**Request (Optional):**
```json
{
  "purchaseId": "507f1f77bcf86cd799439011"
}
```

**Response:**
```json
{
  "message": "Force refund processing completed",
  "result": {
    "processedCount": 1,
    "failedCount": 0,
    "timestamp": "2024-02-03T12:00:00Z"
  }
}
```

**cURL:**
```bash
curl -X POST http://localhost:4000/api/admin/refunds/force-process \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'
```

---

## Webhook Events

### Webhook URL
```
POST http://your-domain.com/api/payments/webhook
```

### Supported Events

| Event | Trigger | Auto-Action |
|-------|---------|-------------|
| `payment.authorized` | Payment authorized by user | Store payment ID |
| `payment.captured` | Payment successfully captured | Mark as paid, +1 download, +10 score |
| `payment.failed` | Payment failed | Mark as failed |
| `refund.created` | Refund initiated | Update status to processing |
| `refund.processed` | Refund completed & credited | Mark as completed, -1 download (if full), -10 score (if full) |
| `refund.failed` | Refund failed | Mark as failed, alert admin |
| `order.paid` | Order confirmed paid | Confirm payment status |

---

## Webhook Payloads

### 1. Payment Authorized
```json
{
  "event": "payment.authorized",
  "payload": {
    "payment": {
      "entity": {
        "id": "pay_1234567890abcdef",
        "order_id": "order_1234567890abcdef",
        "amount": 102500,
        "currency": "INR",
        "status": "authorized"
      }
    }
  }
}
```

---

### 2. Payment Captured
```json
{
  "event": "payment.captured",
  "payload": {
    "payment": {
      "entity": {
        "id": "pay_1234567890abcdef",
        "order_id": "order_1234567890abcdef",
        "amount": 102500,
        "currency": "INR",
        "status": "captured"
      }
    }
  }
}
```

**Auto-Actions:**
- Purchase status → "paid"
- Downloads++
- Feed score +10

---

### 3. Payment Failed
```json
{
  "event": "payment.failed",
  "payload": {
    "payment": {
      "entity": {
        "id": "pay_1234567890abcdef",
        "order_id": "order_1234567890abcdef",
        "amount": 102500,
        "reason": "payment_failed"
      }
    }
  }
}
```

**Auto-Actions:**
- Purchase status → "failed"

---

### 4. Refund Created
```json
{
  "event": "refund.created",
  "payload": {
    "refund": {
      "entity": {
        "id": "rfnd_1234567890abcdef",
        "payment_id": "pay_1234567890abcdef",
        "amount": 102500,
        "status": "created"
      }
    }
  }
}
```

**Auto-Actions:**
- Refund status → "processing"

---

### 5. Refund Processed
```json
{
  "event": "refund.processed",
  "payload": {
    "refund": {
      "entity": {
        "id": "rfnd_1234567890abcdef",
        "payment_id": "pay_1234567890abcdef",
        "amount": 102500,
        "status": "processed"
      }
    }
  }
}
```

**Auto-Actions:**
- Refund status → "completed"
- If full refund:
  - Purchase status → "refunded"
  - Downloads--
  - Feed score -10
- If partial refund:
  - Purchase status → "partially_refunded"

---

### 6. Refund Failed
```json
{
  "event": "refund.failed",
  "payload": {
    "refund": {
      "entity": {
        "id": "rfnd_1234567890abcdef",
        "payment_id": "pay_1234567890abcdef",
        "amount": 102500,
        "reason": "insufficient_balance"
      }
    }
  }
}
```

**Auto-Actions:**
- Refund status → "failed"
- Alert admin for manual investigation

---

### 7. Order Paid
```json
{
  "event": "order.paid",
  "payload": {
    "order": {
      "entity": {
        "id": "order_1234567890abcdef",
        "amount": 102500,
        "currency": "INR",
        "status": "paid"
      }
    }
  }
}
```

**Auto-Actions:**
- Confirm order payment status

---

## Environment Variables

Add these to your `.env` file:

```env
# Razorpay Configuration
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxx
RAZORPAY_WEBHOOK_SECRET=whsec_xxxxxxxxxxxx

# Server Configuration
PORT=4000
NODE_ENV=production

# Database
MONGODB_URI=mongodb://localhost:27017/studenote
```

---

## Frontend Integration

### Example: Payment Flow

```javascript
// 1. Create order
const response = await fetch('/api/payments/create-order', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({ noteId: '507f1f77bcf86cd799439011' })
});

const { orderId, totalAmount, platformFee } = await response.json();

// 2. Initialize Razorpay
const options = {
  key: 'YOUR_RAZORPAY_KEY_ID',
  amount: totalAmount * 100,
  currency: 'INR',
  name: 'Studenote',
  description: 'Purchase Note',
  order_id: orderId,
  handler: async (response) => {
    // 3. Verify payment
    const verifyResponse = await fetch('/api/payments/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        razorpay_order_id: response.razorpay_order_id,
        razorpay_payment_id: response.razorpay_payment_id,
        razorpay_signature: response.razorpay_signature
      })
    });

    const result = await verifyResponse.json();
    if (result.success) {
      console.log('Payment successful!');
      // Redirect to success page
    }
  }
};

const razorpay = new Razorpay(options);
razorpay.open();
```

### Example: Refund Request Flow

```javascript
// Request refund
const refundResponse = await fetch('/api/payments/request-refund', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    purchaseId: '507f1f77bcf86cd799439011',
    reason: 'The content does not match the description provided',
    refundAmount: 1025
  })
});

const refundData = await refundResponse.json();
console.log('Refund ID:', refundData.refundId);

// Check refund status
const statusResponse = await fetch(
  '/api/payments/refund-status/507f1f77bcf86cd799439011',
  {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  }
);

const status = await statusResponse.json();
console.log('Refund Status:', status.refundStatus);
```

---

## Testing Checklist

- [ ] Create order endpoint working
- [ ] Payment verification working
- [ ] Refund request processing
- [ ] Refund status checking
- [ ] Webhooks receiving events
- [ ] Payment captures updating database
- [ ] Refunds auto-completing after 7 days
- [ ] Admin dashboard showing stats
- [ ] Rate limiting active
- [ ] Error handling working

---

**Last Updated:** January 31, 2026
**Version:** 1.0.0 Production Ready
