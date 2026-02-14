# Wallet Earnings System - Explained

## Problem You Encountered
After purchasing a note, the wallet balance remained **0** even though an earning should have been recorded.

## Root Cause
The earnings were being created as "pending" but **never being released** to the wallet because the scheduler was missing.

## How It Works Now

### Flow 1: Payment Captured
1. User purchases a note → Payment is processed
2. `payment.captured` webhook is triggered
3. `creditCreatorWallet()` is called:
   - Creates an **Earning** record with status: "pending"
   - Sets netAmount = price - platformFee
   - Wallet is NOT immediately updated

### Flow 2: Earnings Settlement (Daily)
After 7 days, the **`startEarningsScheduler()`** runs:
1. Finds all earnings with status "pending" created more than 7 days ago
2. For each earning:
   - Updates the wallet: `balance += netAmount`, `totalEarned += netAmount`
   - Changes earning status to "available"

### Flow 3: Wallet Display
When you call `GET /api/wallet`:
- Returns wallet data or default values if wallet doesn't exist yet
- Shows only "available" earnings (from 7 days ago)

## Settlement Window: Why 7 Days?
- **Protection against chargebacks**: If a payment is disputed within 7 days, the earning is reversed
- **Safety net**: Ensures funds are stable before releasing to creator

## For Testing - Manual Settlement
**Endpoint**: `POST /api/admin/earnings/settle-now`
**Headers**: Include admin auth token
**Response**: Immediately releases all pending earnings to wallet

**Example**:
```bash
curl -X POST http://localhost:4000/api/admin/earnings/settle-now \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

## What Changed
✅ Created `src/services/payments/earnings.scheduler.ts` - Daily scheduler
✅ Updated `src/index.ts` - Now starts earnings scheduler
✅ Created `src/controllers/admin/payments/earnings.admin.controller.ts` - Admin endpoint
✅ Updated `src/routes/admin/payments/admin.payout.routes.ts` - Added route

## Testing Locally
```bash
# To immediately see earnings in wallet (don't wait 7 days):
POST /api/admin/earnings/settle-now

# Then check wallet:
GET /api/wallet

# Should now show the earned amount in balance and totalEarned fields
```

## Important Notes
- ⏱️ Scheduler runs **every 24 hours** automatically
- 💾 Earnings are stored in `Earning` collection with status tracking
- 🔄 If refunded, earnings are reversed and returned to "pending"
- 📊 Wallet shows cumulative `totalEarned` and current `balance`
