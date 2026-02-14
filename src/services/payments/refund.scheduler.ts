/**
 * Refund Scheduler Service (DISABLED BY POLICY)
 * --------------------------------------------
 * Refunds are handled manually / exceptionally only.
 * No automatic refund processing or background jobs are allowed.
 *
 * Reason:
 * - Refunds only for payment failures or technical delivery issues
 * - No general refund policy for successful purchases
 */

export const startRefundScheduler = () => {
    console.log("[Refund Scheduler] Disabled by refund policy (manual refunds only)");
};

export const stopRefundScheduler = () => {
    console.log("[Refund Scheduler] Disabled");
};

export const triggerManualRefundProcessing = async () => {
    throw new Error("Automatic refund processing is disabled by policy");
};

export const getRefundSchedulerStatus = () => {
    return {
        isRunning: false,
        interval: "disabled",
        lastCheck: new Date(),
        policy: "Manual refunds only",
    };
};
