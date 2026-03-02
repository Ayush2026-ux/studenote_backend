import dotenv from "dotenv";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";

// 🔥 Load env first
dotenv.config({
  path: path.resolve(__dirname, "../.env"),
});

import app from "./app";
import connectToMongo from "./config/mongodb";
import { startRefundScheduler } from "./services/payments/refund.scheduler";
import { startEarningsScheduler } from "./services/payments/earnings.scheduler";

const execAsync = promisify(exec);

const PORT = Number(process.env.PORT) || 4000;

/* ===========================================
   🔥 Ghostscript Availability Check
=========================================== */
const checkGhostscript = async () => {
  try {
    const { stdout } = await execAsync("gs --version");
    console.log(" Ghostscript detected. Version:", stdout.trim());
  } catch (err) {
    console.error(" Ghostscript NOT installed.");
    console.error(" Add nixpacks.toml with aptPkgs = ['ghostscript']");
  }
};

const startServer = async () => {
  try {
    await connectToMongo();

    // 🔥 Check Ghostscript before starting server
    await checkGhostscript();

    startRefundScheduler();
    startEarningsScheduler();

    const server = app.listen(PORT, "0.0.0.0", () => {
      console.log(` Server running on port ${PORT}`);
    });

    // 🔥 Increase timeout for large PDF compression
    server.setTimeout(600000); // 10 minutes
    server.keepAliveTimeout = 610000;

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