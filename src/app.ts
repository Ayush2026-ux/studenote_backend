import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

import authRoutes from "./routes/users/auth.routes";
import uploadRoutes from "./routes/users/upload.routes";


const app = express();

/* ================= MIDDLEWARES ================= */

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(helmet());

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

app.use(morgan("dev"));

/* ================= ROUTES ================= */

// 🔓 PUBLIC ROUTES (NO TOKEN)
app.use("/api", authRoutes);

// 🔐 PROTECTED ROUTES
app.use("/api", uploadRoutes);

app.get("/api", (_req, res) => {
  res.json({ message: "API running 🚀" });
});

/* ================= GLOBAL ERROR HANDLER ================= */

app.use(
  (
    err: any,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error("GLOBAL ERROR:", err);
    res.status(err.status || 500).json({
      success: false,
      message: err.message || "Internal Server Error",
    });
  }
);

export default app;
