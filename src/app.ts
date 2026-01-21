import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

/* ================= ROUTES ================= */

import authRoutes from "./routes/users/auth.routes";
import uploadRoutes from "./routes/users/upload.routes";
import home from "./routes/users/home.routes";
import userSearchRoutes from "./routes/chat/user.search.routes";

// 🟢 CHAT ROUTES
import chatRoutes from "../src/routes/chat/chat.routes";
import requestRoutes from "../src/routes/chat/request.routes";

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

/* ================= IMPORTANT (Cloudflare / Proxy) ================= */

app.set("trust proxy", true);

/* ================= ROOT + HEALTH ROUTES ================= */

// ✅ ROOT ROUTE
app.get("/", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "Studenote Backend is running 🚀",
  });
});

// ✅ HEALTH CHECK
app.get("/health", (_req, res) => {
  res.status(200).send("OK");
});




app.use("/api", userSearchRoutes);


/* ================= ROUTES ================= */

// 🔓 PUBLIC AUTH ROUTES
app.use("/api", authRoutes);

// 🔐 PROTECTED UPLOAD ROUTES
app.use("/api", uploadRoutes);

// 📚 NOTES ROUTES
app.use("/api/notes", home);

// 💬 CHAT ROUTES (INBOX + MESSAGES)
app.use("/api", chatRoutes);

// 📩 MESSAGE REQUEST ROUTES (INSTAGRAM STYLE)
app.use("/api", requestRoutes);

// API sanity check
app.get("/api", (_req, res) => {
  res.json({ message: "API running 🚀" });
});

/* ================= 404 HANDLER ================= */

app.use((_req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
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
