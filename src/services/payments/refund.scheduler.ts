import { autoProcessRefunds, getRefundsNearCompletion } from "./refund.service";

/**
 * Refund Scheduler Service
 * Handles automatic refund processing and notifications
 * Runs as background jobs at scheduled intervals
 */

let refundSchedulerInterval: NodeJS.Timeout | null = null;

/**
 * Start the refund processing scheduler
 * Runs every 6 hours to check and process pending refunds
 * Can be customized to run at different intervals
 */
export const startRefundScheduler = () => {
    if (refundSchedulerInterval) {
        console.log("Refund scheduler is already running");
        return;
    }

    // Run every 6 hours (6 * 60 * 60 * 1000 milliseconds)
    const SCHEDULER_INTERVAL = 6 * 60 * 60 * 1000;

    refundSchedulerInterval = setInterval(async () => {
        try {
            console.log("[Refund Scheduler] Starting scheduled refund processing...");
            const result = await autoProcessRefunds();
            console.log("[Refund Scheduler] Completed:", result);

            // Check for refunds near completion and trigger notifications
            const nearCompletion = await getRefundsNearCompletion();
            if (nearCompletion.length > 0) {
                console.log(
                    `[Refund Scheduler] ${nearCompletion.length} refunds near completion, sending notifications...`
                );
                // TODO: Send email/push notifications to users
                // await sendRefundCompletionNotifications(nearCompletion);
            }
        } catch (error) {
            console.error("[Refund Scheduler] Error during scheduled execution:", error);
        }
    }, SCHEDULER_INTERVAL);

    console.log("[Refund Scheduler] Started - will run every 6 hours");
};

/**
 * Stop the refund processing scheduler
 */
export const stopRefundScheduler = () => {
    if (refundSchedulerInterval) {
        clearInterval(refundSchedulerInterval);
        refundSchedulerInterval = null;
        console.log("[Refund Scheduler] Stopped");
    }
};

/**
 * Manually trigger refund processing (useful for testing or admin operations)
 */
export const triggerManualRefundProcessing = async () => {
    try {
        console.log("[Refund Scheduler] Manual trigger - processing refunds...");
        const result = await autoProcessRefunds();
        const nearCompletion = await getRefundsNearCompletion();

        return {
            processing: result,
            nearCompletion,
            timestamp: new Date(),
        };
    } catch (error) {
        console.error("[Refund Scheduler] Error in manual trigger:", error);
        throw error;
    }
};

/**
 * Get scheduler status
 */
export const getRefundSchedulerStatus = () => {
    return {
        isRunning: refundSchedulerInterval !== null,
        interval: "Every 6 hours",
        lastCheck: new Date(),
    };
};

/**
 * Alternative: Use node-cron for more precise scheduling
 * Install: npm install node-cron
 * Usage:
 *
 * import cron from 'node-cron';
 *
 * export const startRefundCronScheduler = () => {
 *   // Run every day at 2 AM
 *   cron.schedule('0 2 * * *', async () => {
 *     try {
 *       console.log('Cron: Running refund processing...');
 *       await autoProcessRefunds();
 *     } catch (error) {
 *       console.error('Cron Error:', error);
 *     }
 *   });
 *   console.log('Cron scheduler started');
 * };
 */
