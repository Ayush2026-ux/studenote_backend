import dotenv from "dotenv";
import path from "path";
import app from "./app";
import connectToMongo from "./config/mongodb";

dotenv.config({
  path: path.resolve(__dirname, "../.env"),
});

const PORT = Number(process.env.PORT) || 4000;

const startServer = async () => {
  try {
    //  Connect DB
    await connectToMongo();

    // Start server
    const server = app.listen(PORT, "0.0.0.0", () => {
      console.log(` Server running on port ${PORT}`);
    });

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
