# Webhook Debugging Guide

## Issues Fixed ✅

1. **Signature Verification** - Added proper buffer handling and logging
2. **Missing Event Logging** - Added comprehensive logging throughout the webhook pipeline
3. **Better Error Tracking** - All handlers now log what they're processing

## Testing Your Webhook

### 1. **Local Testing with Postman or cURL**

```bash
# First, get a valid Razorpay webhook signature
# You need: 
# - RAZORPAY_WEBHOOK_SECRET from your env
# - A valid request body

# Example using Node.js to generate signature:
node -e "
const crypto = require('crypto');
const secret = 'your_webhook_secret';
const body = JSON.stringify({event: 'payment.captured', payload: {payment: {entity: {id: 'pay_123', order_id: 'order_123', notes: {noteId: '123', userId: '456', platformFee: 5}}}}});
const signature = crypto.createHmac('sha256', secret).update(body).digest('hex');
console.log('Signature:', signature);
console.log('Body:', body);
"
```

### 2. **Verify Webhook Endpoint**

```bash
# Check endpoint is accessible
curl http://localhost:5000/api/payments/webhook -X POST \
  -H "Content-Type: application/json" \
  -H "x-razorpay-signature: test" \
  -d '{"event":"payment.captured"}'
```

### 3. **Check Environment Variables**

```bash
# Make sure RAZORPAY_WEBHOOK_SECRET is set
echo $RAZORPAY_WEBHOOK_SECRET

# Should NOT be empty or undefined
```

## Webhook Signature Verification Flow

```
1. Razorpay sends webhook → /api/payments/webhook
2. Express receives raw body as Buffer (express.raw middleware)
3. razorpayWebhookMiddleware verifies HMAC-SHA256 signature
4. If valid → handleAllWebhooks routes to specific handler
5. Handler processes event and returns { received: true }
```

## What to Look For in Logs

### ✅ **Success Flow**
```
🔐 Webhook Signature Verification:
   Expected: abc123...
   Received: abc123...
   Match: true
✅ Webhook signature verified
🔔 Webhook Event Received: payment.captured
💳 Payment Details: {...}
✅ Purchase created: ObjectId(...)
✨ Payment captured & purchase created: pay_123
```

### ❌ **Failure Cases**

#### **Invalid Signature**
```
🔐 Webhook Signature Verification:
   Match: false
❌ Invalid webhook signature
```
**Fix**: Check RAZORPAY_WEBHOOK_SECRET matches Razorpay dashboard

#### **Missing Event Data**
```
⚠️  Missing noteId or userId in payment notes
```
**Fix**: Verify you're passing notes in create-order endpoint

#### **Duplicate Payment**
```
ℹ️  Purchase already exists (idempotency check): pay_123
```
**This is OK** - Razorpay retries webhooks, idempotency prevents duplicates

#### **Note Not Found**
```
⚠️  Note not found: invalid_note_id
```
**Fix**: Ensure noteId is valid before creating order

## Common Issues & Solutions

### Issue 1: 400 Error on Webhook
```
Missing Razorpay signature
Invalid webhook signature
```
**Solution**: 
- Verify X-Razorpay-Signature header is being sent
- Verify RAZORPAY_WEBHOOK_SECRET is correct
- Check request body is being sent as raw JSON

### Issue 2: Webhook Not Being Called
**Solution**:
1. Check Razorpay dashboard - Webhook Settings → Verify URL is correct
2. Check port/ngrok tunnel is active
3. Verify endpoint: `POST /api/payments/webhook`
4. Check CORS isn't blocking it (webhook is server-to-server, shouldn't be blocked)

### Issue 3: Purchase Not Created Despite 200 Response
**Solutions**:
1. Check MongoDB connection - is `purchaseModel.create()` working?
2. Check noteId/userId are valid ObjectIds
3. Check `NotesUpload` model has that note
4. Look for database errors in logs

### Issue 4: Duplicate Purchases
**Solution**: This is prevented by idempotency check with `razorpayPaymentId`. If duplicates occur:
1. Check `razorpayPaymentId` is unique
2. Check `purchaseModel` has proper indexes

## Verification Checklist

- [ ] `RAZORPAY_WEBHOOK_SECRET` is set in `.env`
- [ ] Webhook URL in Razorpay Dashboard: `https://yourdomain.com/api/payments/webhook`
- [ ] All 4 webhook events are enabled in Razorpay:
  - `payment.captured`
  - `refund.created`
  - `refund.processed`
  - `refund.failed`
- [ ] MongoDB connection is active
- [ ] Notes exist in database (create-order checks this)
- [ ] Users exist in database
- [ ] Check logs for all the emoji-prefixed log lines

## Testing with Razorpay's Webhook Dashboard

1. Go to Razorpay Dashboard → Settings → Webhooks
2. Find your webhook endpoint
3. Click "Test Webhook" and select an event
4. Check your server logs for the signature verification logs
5. Verify the database was updated

## Debug Mode

To enable maximum logging, temporarily add this to webhooks.controller.ts:

```typescript
export const handleAllWebhooks = async (req: Request, res: Response) => {
    console.log("═══════════════════════════════════════");
    console.log("FULL REQUEST OBJECT:");
    console.log("Headers:", req.headers);
    console.log("Body:", req.body);
    console.log("═══════════════════════════════════════");
    
    // ... rest of handler
}
```

## Support

If webhook still not working:
1. Check all logs in sequence
2. Verify signature verification passes first
3. Verify event type is correct
4. Check database queries are executing
5. Check for unhandled promise rejections
