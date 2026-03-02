import dotenv from "dotenv";
import path from "path";

// 🔥 Load env first (very important)
dotenv.config({
  path: path.resolve(__dirname, "../.env"),
});

import app from "./app";
import connectToMongo from "./config/mongodb";
import { startRefundScheduler } from "./services/payments/refund.scheduler";
import { startEarningsScheduler } from "./services/payments/earnings.scheduler";

const PORT = Number(process.env.PORT) || 4000;

const startServer = async () => {
  try {
    await connectToMongo();

    startRefundScheduler();
    startEarningsScheduler();

    const server = app.listen(PORT, "0.0.0.0", () => {
      console.log(` Server running on port ${PORT}`);
    });

    server.setTimeout(300000);
    server.keepAliveTimeout = 310000;

    const shutdown = () => {
      console.log(" Shutting down server...");
      server.close(() => process.exit(0));
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  } catch (err) {
    console.error(" Failed to start server:", err);
    process.exit(1);
  }
};

startServer();
