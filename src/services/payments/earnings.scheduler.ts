/**
 * Earnings Settlement Scheduler (DISABLED)
 * ---------------------------------------
 * Wallet is credited immediately on successful payment.
 * No delayed settlement or cron-based processing is used.
 */

export const startEarningsScheduler = () => {
    console.log("[Earnings Scheduler] Disabled - instant wallet credit is enabled");
};

export const stopEarningsScheduler = () => {
    console.log("[Earnings Scheduler] Disabled");
};

export const triggerManualEarningsSettlement = async () => {
    throw new Error("Earnings scheduler is disabled. Wallet is credited instantly.");
};

export const getEarningsSchedulerStatus = () => {
    return {
        isRunning: false,
        interval: "disabled",
        policy: "Instant wallet credit on payment success",
        serverTime: new Date(),
    };
};
