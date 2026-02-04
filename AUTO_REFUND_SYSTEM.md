# Auto-Refund System Documentation

## Overview
The auto-refund system automatically processes pending refunds after 7-8 **business days** (excluding weekends) and credits them back to users' payment accounts.

## How It Works

### Refund Processing Timeline

1. **Day 0**: User requests refund
   - Status: `refundStatus: "processing"`
   - Razorpay refund initiated
   - `refundRequestedAt` timestamp recorded

2. **Days 1-6**: Processing phase
   - System monitors refund status
   - Scheduler checks every 6 hours
   - Notifications sent at day 6-7

3. **Day 7-8**: Auto-completion
   - Scheduler detects 7+ business days elapsed
   - Automatically marks refund as `completed`
   - `refundCompletedAt` timestamp recorded
   - Refund credited to user account

### Business Days Calculation

- **Includes**: Monday-Friday (5 days per week)
- **Excludes**: Saturday, Sunday
- **Example**: 
  - Requested on Monday → Auto-completed on next Monday-Tuesday
  - Requested on Friday → Auto-completed on following Wednesday-Thursday

## Architecture

### Components

```
refund.service.ts
├── autoProcessRefunds()          // Auto-complete refunds after 7-8 days
├── calculateBusinessDays()       // Count business days
├── getRefundsNearCompletion()   // Get refunds near completion (6-7 days)
└── getRefundProcessingStats()   // Admin statistics

refund.scheduler.ts
├── startRefundScheduler()        // Start background job (every 6 hours)
├── stopRefundScheduler()         // Stop background job
├── triggerManualRefundProcessing() // Manual trigger for testing
└── getRefundSchedulerStatus()    // Check scheduler status

refund.admin.controller.ts
├── getRefundStats()              // GET /api/admin/refunds/stats
├── getNearCompletionRefunds()    // GET /api/admin/refunds/near-completion
├── manualRefundProcessing()      // POST /api/admin/refunds/manual-process
├── getSchedulerStatus()          // GET /api/admin/refunds/scheduler-status
└── forceRefundProcessing()       // POST /api/admin/refunds/force-process
```

## API Endpoints

### Admin Endpoints

#### 1. Get Refund Statistics
```
GET /api/admin/refunds/stats
Authorization: Bearer <admin-token>

Response:
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
    }
  ],
  "timeline": [
    {
      "purchaseId": "ObjectId",
      "userId": "ObjectId",
      "refundAmount": 1025,
      "businessDaysElapsed": 3,
      "status": "processing",
      "requestedAt": "2024-01-31T10:30:00Z"
    }
  ],
  "timestamp": "2024-02-03T12:00:00Z"
}
```

#### 2. Get Refunds Near Completion
```
GET /api/admin/refunds/near-completion
Authorization: Bearer <admin-token>

Response:
{
  "count": 2,
  "refunds": [
    {
      "purchaseId": "ObjectId",
      "refundedAmount": 1025,
      "userId": "ObjectId",
      "businessDaysElapsed": 6,
      "expectedCompletionDays": 2,
      "refundRequestedAt": "2024-01-25T10:30:00Z"
    }
  ],
  "timestamp": "2024-02-03T12:00:00Z"
}
```

#### 3. Get Scheduler Status
```
GET /api/admin/refunds/scheduler-status
Authorization: Bearer <admin-token>

Response:
{
  "isRunning": true,
  "interval": "Every 6 hours",
  "lastCheck": "2024-02-03T12:00:00Z"
}
```

#### 4. Manual Refund Processing
```
POST /api/admin/refunds/manual-process
Authorization: Bearer <admin-token>

Response:
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

#### 5. Force Refund Processing
```
POST /api/admin/refunds/force-process
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "purchaseId": "ObjectId" // optional for specific purchase
}

Response:
{
  "message": "Force refund processing completed",
  "result": {
    "processedCount": 1,
    "failedCount": 0,
    "timestamp": "2024-02-03T12:00:00Z"
  }
}
```

## Scheduler Configuration

### Current Configuration

```typescript
// Runs every 6 hours
const SCHEDULER_INTERVAL = 6 * 60 * 60 * 1000;
```

### Alternative: Use node-cron (For Precise Scheduling)

```bash
npm install node-cron
```

```typescript
// Run at 2 AM every day
import cron from 'node-cron';

export const startRefundCronScheduler = () => {
  cron.schedule('0 2 * * *', async () => {
    console.log('Cron: Running refund processing...');
    await autoProcessRefunds();
  });
};
```

## Data Model Updates

### Purchase Schema Changes

```typescript
interface IPurchase extends Document {
  // ... existing fields
  
  // Refund fields
  refundStatus?: "pending" | "processing" | "completed" | "failed";
  razorpayRefundId?: string;
  refundAmount?: number;
  refundReason?: string;
  refundRequestedAt?: Date;    // Auto-set when refund requested
  refundCompletedAt?: Date;    // Auto-set when auto-completed
  
  createdAt: Date;             // Purchase timestamp
  updatedAt: Date;
}
```

## Workflow Example

### Scenario: User Requests Refund on Monday

```
Monday, Jan 29:
  - 10:30 AM: User requests refund
  - Purchase.refundRequestedAt = Monday 10:30 AM
  - refundStatus = "processing"

Tuesday-Thursday, Jan 30 - Feb 1:
  - Scheduler runs every 6 hours
  - businessDaysElapsed = 1, 2, 3 (still processing)

Friday, Feb 1:
  - businessDaysElapsed = 4 (Friday is 5th business day)
  - Notification sent: "Refund completing within 2-3 business days"

Monday-Tuesday, Feb 4-5:
  - businessDaysElapsed = 7
  - Scheduler auto-completes refund
  - refundStatus = "completed"
  - refundCompletedAt = Feb 4 (or 5) timestamp

Result:
  - 7-8 business days elapsed
  - Refund automatically credited
  - User notified of completion
```

## Key Features

✅ **Automatic Processing**: No manual intervention needed after 7-8 business days
✅ **Business Days Only**: Weekends and holidays excluded
✅ **Real-time Monitoring**: Scheduler runs every 6 hours
✅ **Notifications**: Send alerts to users near completion
✅ **Admin Dashboard**: Track all refunds in real-time
✅ **Manual Override**: Force process specific refunds if needed
✅ **Atomic Transactions**: Database transactions prevent partial updates
✅ **Comprehensive Logging**: All operations logged for compliance

## Implementation in App Startup

```typescript
// src/index.ts
import { startRefundScheduler } from "./services/payments/refund.scheduler";

const startServer = async () => {
  try {
    await connectToMongo();
    
    // Start refund scheduler
    startRefundScheduler();
    
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Server startup error:", error);
  }
};
```

## Monitoring & Alerts

### Recommended Alerts

1. **Refund Processing Failures**
   - Trigger: Failed count > 0 in a cycle
   - Action: Alert admin immediately

2. **Delayed Refunds**
   - Trigger: businessDaysElapsed > 10 and status still "processing"
   - Action: Alert admin and investigate Razorpay status

3. **High Refund Rate**
   - Trigger: > 15% of payments refunded in last 30 days
   - Action: Alert management, investigate quality issues

## Database Indexes

Add these indexes for optimal performance:

```typescript
// purchase.model.ts
PurchaseSchema.index({ refundStatus: 1, refundRequestedAt: 1 });
PurchaseSchema.index({ user: 1, refundStatus: 1 });
PurchaseSchema.index({ status: 1, refundStatus: 1 });
```

## Error Handling

| Error | Cause | Resolution |
|-------|-------|-----------|
| `Purchase not found` | Invalid ID | Verify purchaseId exists |
| `Refund already completed` | Idempotent check | Safe to retry |
| `Unauthorized` | User mismatch | Verify user ownership |
| `Transaction failed` | Database error | Automatic rollback & retry |
| `Scheduler error` | System issue | Check logs, manually trigger if needed |

## Future Enhancements

- [ ] Email notifications for refund milestones
- [ ] Push notifications for mobile apps
- [ ] SMS notifications for important updates
- [ ] Holiday calendar support for calculation
- [ ] Partial refund auto-completion
- [ ] Refund analytics dashboard
- [ ] Bulk refund processing
- [ ] Tax reversal handling

## Testing

### Manual Testing

```bash
# Trigger immediate refund processing
curl -X POST http://localhost:4000/api/admin/refunds/manual-process \
  -H "Authorization: Bearer <admin-token>"

# Check scheduler status
curl http://localhost:4000/api/admin/refunds/scheduler-status \
  -H "Authorization: Bearer <admin-token>"

# Get near-completion refunds
curl http://localhost:4000/api/admin/refunds/near-completion \
  -H "Authorization: Bearer <admin-token>"
```

### Unit Tests

```typescript
describe('Auto-Refund System', () => {
  it('should calculate business days correctly', () => {
    const start = new Date('2024-01-29'); // Monday
    const end = new Date('2024-02-05');   // Monday (7 business days)
    expect(calculateBusinessDays(start, end)).toBe(7);
  });

  it('should skip weekends', () => {
    const start = new Date('2024-01-26'); // Friday
    const end = new Date('2024-02-05');   // Monday (6 business days)
    expect(calculateBusinessDays(start, end)).toBe(6);
  });

  it('should auto-complete refunds after 7 days', async () => {
    // Create purchase with refundRequestedAt 8 days ago
    // Run autoProcessRefunds()
    // Verify refundStatus changed to "completed"
  });
});
```

---

**Last Updated**: January 31, 2026
**Version**: 2.0.0 with Auto-Refund System
