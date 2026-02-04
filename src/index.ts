import dotenv from "dotenv";
import path from "path";
import app from "./app";
import connectToMongo from "./config/mongodb";
import { startRefundScheduler } from "./services/payments/refund.scheduler";

dotenv.config({
  path: path.resolve(__dirname, "../.env"),
});

const PORT = Number(process.env.PORT) || 4000;

const startServer = async () => {
  try {
    //  Connect DB
    await connectToMongo();

    // Start refund scheduler for auto-processing
    startRefundScheduler();

    // Start server
    const server = app.listen(PORT, "0.0.0.0", () => {
      console.log(` Server running on port ${PORT}`);
    });

    // ✅ Set server timeouts for large file uploads
    server.setTimeout(300000); // 5 minutes
    server.keepAliveTimeout = 310000; // 5 minutes + 10 seconds

    //  Graceful shutdown
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
