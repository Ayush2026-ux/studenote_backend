import dotenv from "dotenv";
import app from "./app";
import connectToMongo from "./config/mongodb";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const PORT = Number(process.env.PORT) || 4000;

const startServer = async () => {
  try {
    // 1️⃣ Connect DB first
    await connectToMongo();

    // 2️⃣ Start server only if DB connected
    const server = app.listen(PORT, "0.0.0.0", () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });

    // Graceful shutdown
    const shutdown = () => {
      console.log("🔴 Shutting down...");
      server.close(() => process.exit(0));
    };

    process.on("SIGTERM", shutdown);
    process.on("SIGINT", shutdown);
  } catch (err) {
    console.error("❌ Failed to start server", err);
    process.exit(1);
  }
};

startServer();
