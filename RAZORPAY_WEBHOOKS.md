# Razorpay Webhooks Integration Guide

## Overview
Webhooks allow Razorpay to notify your backend about payment events in real-time. This system handles all major payment and refund events automatically.

## Supported Webhook Events

| Event | Trigger | Action |
|-------|---------|--------|
| `payment.authorized` | Payment authorized | Store payment ID |
| `payment.captured` | Payment captured | Mark purchase as paid, increment downloads |
| `payment.failed` | Payment failed | Mark purchase as failed |
| `refund.created` | Refund initiated | Update refund status to processing |
| `refund.processed` | Refund completed | Mark refund as completed, reverse stats |
| `refund.failed` | Refund failed | Mark refund as failed, alert admin |
| `order.paid` | Order paid | Confirm payment status |
| `invoice.paid` | Invoice paid | Handle invoicing (future) |
| `subscription.created` | Subscription created | Handle subscriptions (future) |

## Setup Instructions

### Step 1: Add Webhook Secret to Environment

Add to your `.env` file:
```env
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret_from_razorpay_dashboard
```

### Step 2: Configure Webhook in Razorpay Dashboard

1. Go to [Razorpay Dashboard](https://dashboard.razorpay.com/)
2. Navigate to **Settings > Webhooks**
3. Click **Add New Webhook**
4. Fill in the following details:

```
Webhook URL: https://your-domain.com/api/payments/webhook
OR (for development): https://your-ngrok-url.ngrok.io/api/payments/webhook

Events to Subscribe:
✓ payment.authorized
✓ payment.captured
✓ payment.failed
✓ refund.created
✓ refund.processed
✓ refund.failed
✓ order.paid

Active: Enabled
```

5. Copy the **Webhook Secret** and add to `.env`
6. Click **Create Webhook**

### Step 3: Testing Webhooks Locally

#### Option A: Using ngrok (Recommended)

```bash
# Install ngrok
choco install ngrok  # Windows
brew install ngrok   # Mac
apt install ngrok    # Linux

# Start ngrok tunnel
ngrok http 4000

# Copy the HTTPS URL (e.g., https://abc123.ngrok.io)
# Add to Razorpay dashboard: https://abc123.ngrok.io/api/payments/webhook
```

#### Option B: Using Postman

```
Method: POST
URL: http://localhost:4000/api/payments/webhook

Headers:
Content-Type: application/json
X-Razorpay-Signature: <your_signature>

Body (raw JSON):
{
  "event": "payment.captured",
  "payload": {
    "payment": {
      "entity": {
        "id": "pay_xxx",
        "order_id": "order_xxx",
        "amount": 102500,
        "currency": "INR",
        "status": "captured"
      }
    }
  }
}
```

#### Option C: Using curl

```bash
curl -X POST http://localhost:4000/api/payments/webhook \
  -H "Content-Type: application/json" \
  -H "X-Razorpay-Signature: test_signature" \
  -d '{
    "event": "payment.captured",
    "payload": {
      "payment": {
        "entity": {
          "id": "pay_xxx",
          "order_id": "order_xxx",
          "amount": 102500
        }
      }
    }
  }'
```

## Webhook Event Details

### 1. Payment Authorized
```json
{
  "event": "payment.authorized",
  "payload": {
    "payment": {
      "entity": {
        "id": "pay_xxx",
        "order_id": "order_xxx",
        "amount": 102500,
        "currency": "INR",
        "status": "authorized"
      }
    }
  }
}
```
**Action**: Stores payment ID in purchase record

---

### 2. Payment Captured
```json
{
  "event": "payment.captured",
  "payload": {
    "payment": {
      "entity": {
        "id": "pay_xxx",
        "order_id": "order_xxx",
        "amount": 102500,
        "currency": "INR",
        "status": "captured"
      }
    }
  }
}
```
**Action**: 
- Updates purchase status to "paid"
- Increments note downloads
- Increases feed score by 10

---

### 3. Payment Failed
```json
{
  "event": "payment.failed",
  "payload": {
    "payment": {
      "entity": {
        "id": "pay_xxx",
        "order_id": "order_xxx",
        "amount": 102500,
        "reason": "payment_failed"
      }
    }
  }
}
```
**Action**: Updates purchase status to "failed"

---

### 4. Refund Created
```json
{
  "event": "refund.created",
  "payload": {
    "refund": {
      "entity": {
        "id": "rfnd_xxx",
        "payment_id": "pay_xxx",
        "amount": 102500,
        "status": "created"
      }
    }
  }
}
```
**Action**: Updates refund status to "processing"

---

### 5. Refund Processed
```json
{
  "event": "refund.processed",
  "payload": {
    "refund": {
      "entity": {
        "id": "rfnd_xxx",
        "payment_id": "pay_xxx",
        "amount": 102500,
        "status": "processed"
      }
    }
  }
}
```
**Action**:
- Updates refund status to "completed"
- If full refund: decrements downloads, reduces feed score by 10
- If partial refund: updates status to "partially_refunded"

---

### 6. Refund Failed
```json
{
  "event": "refund.failed",
  "payload": {
    "refund": {
      "entity": {
        "id": "rfnd_xxx",
        "payment_id": "pay_xxx",
        "amount": 102500,
        "reason": "insufficient_balance"
      }
    }
  }
}
```
**Action**: 
- Updates refund status to "failed"
- Alert admin for manual investigation

---

### 7. Order Paid
```json
{
  "event": "order.paid",
  "payload": {
    "order": {
      "entity": {
        "id": "order_xxx",
        "amount": 102500,
        "currency": "INR",
        "status": "paid"
      }
    }
  }
}
```
**Action**: Confirms order payment status

---

## Database Flow

### Payment Flow
```
User creates order
        ↓
payment.authorized → Store payment ID
        ↓
payment.captured → Mark as PAID
        ↓
Purchase.status = "paid"
Downloads++
FeedScore+10
```

### Refund Flow
```
User requests refund
        ↓
refund.created → Status = PROCESSING
        ↓
refund.processed → Status = COMPLETED
        ↓
If Full Refund:
  Purchase.status = "refunded"
  Downloads--
  FeedScore-10
```

## Error Handling

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Webhook not being called | URL not correct | Verify ngrok URL in dashboard |
| Signature mismatch | Wrong secret | Check RAZORPAY_WEBHOOK_SECRET in .env |
| 404 Not Found | Route doesn't exist | Ensure routes are registered in app.ts |
| Database error | Transaction failure | Check MongoDB connection |
| Duplicate events | Retry mechanism | Webhook is idempotent (safe to retry) |

### Webhook Retry Logic

Razorpay will retry failed webhooks:
- After 5 seconds
- After 30 seconds
- After 5 minutes
- After 30 minutes
- After 2 hours
- After 5 hours
- After 10 hours

---

## Monitoring & Logging

All webhooks are logged with timestamps:

```typescript
console.log("Webhook received:", event); // Event type
console.log("Payment Captured:", payment.id); // Specific action
console.log(`Refund completed for purchase ${purchase._id}`); // Result
```

### Check Logs

```bash
# View webhook activity
grep "Webhook received" logs/*.log

# View specific event
grep "Payment Captured" logs/*.log

# Real-time monitoring
tail -f logs/application.log | grep "Webhook"
```

---

## Security Best Practices

✅ **Signature Verification**: All webhooks verified with HMAC-SHA256
✅ **Rate Limiting**: Applied to webhook endpoint
✅ **Audit Logging**: All events logged for compliance
✅ **Atomic Transactions**: Database consistency guaranteed
✅ **Idempotent Operations**: Safe to retry
✅ **Error Handling**: Graceful fallback on failures

---

## Production Checklist

- [ ] RAZORPAY_WEBHOOK_SECRET added to production `.env`
- [ ] Webhook URL configured in Razorpay dashboard (production domain)
- [ ] SSL/HTTPS enabled on webhook endpoint
- [ ] Rate limiting configured
- [ ] Monitoring and alerts set up
- [ ] Database backups enabled
- [ ] Error notifications configured
- [ ] Test payment processed successfully
- [ ] Test refund processed successfully
- [ ] Logs monitored for issues

---

## Example Implementation

### Frontend Integration Example

```javascript
// After payment is successful
async function handlePaymentSuccess(response) {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = response;

  try {
    // Verify payment with backend
    const res = await fetch('/api/payments/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature
      })
    });

    const data = await res.json();
    
    if (data.success) {
      // Payment verified - show success message
      console.log('Payment successful!');
      // Webhook will handle database updates automatically
    }
  } catch (error) {
    console.error('Payment verification failed:', error);
  }
}
```

---

## API Reference

### Webhook Endpoint
```
POST /api/payments/webhook
Content-Type: application/json
X-Razorpay-Signature: <signature>

Headers:
{
  "X-Razorpay-Signature": "HMAC-SHA256 signature"
}

Body:
{
  "event": "event_type",
  "payload": { ... }
}

Response:
{
  "received": true
}
```

---

## Troubleshooting

### Test Webhook Delivery

```bash
# Check if endpoint is accessible
curl -i https://your-domain.com/api/payments/webhook

# Should return 405 Method Not Allowed (GET not allowed)
```

### View Webhook Attempts in Razorpay

1. Go to Razorpay Dashboard
2. Settings > Webhooks
3. Click on your webhook
4. View "Delivery Attempts" tab
5. Check status and response

### Debug Webhook

Add this to payments controller:
```typescript
console.log('Full webhook payload:', JSON.stringify(req.body, null, 2));
console.log('Headers:', req.headers);
```

---

## Future Enhancements

- [ ] Webhook retry mechanism on failure
- [ ] Webhook delivery status dashboard
- [ ] Custom webhook event filtering
- [ ] Batch webhook processing
- [ ] Webhook event history API
- [ ] Real-time webhook status alerts

---

**Last Updated**: January 31, 2026
**Version**: 1.0.0
