import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

/* ================= ROUTES ================= */

import authRoutes from "./routes/users/auth.routes";
import uploadRoutes from "./routes/users/upload.routes";
import home from "./routes/users/home.route";
import feedRoutes from "./routes/users/feed.routes";
import commentRoutes from "./routes/users/comment.routes";
import followRoutes from "./routes/users/follow.routes";
import saveRoutes from "./routes/users/save.routes";
import notificationRoutes from "./routes/users/notification.routes";
import feedLikeRoutes from "./routes/users/feedLike.routes";
import feedViewRoutes from "./routes/users/feedView.routes";
import profileRoutes from "./routes/users/profile.routes";
import sharesRoutes from "./routes/users/share.routes";
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

// PUBLIC ROUTES (NO TOKEN)
app.use("/api", authRoutes);

//  PROTECTED ROUTES
app.use("/api", uploadRoutes);
app.use("/api/notes", home)

// feed routes
app.use("/api/feeds", feedRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api/follow", followRoutes);
app.use("/api/save", saveRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/feedlikes", feedLikeRoutes);
app.use("/api/feedviews", feedViewRoutes);
app.use("/api/shares", sharesRoutes);

// profile routes

app.use("/api/users/profile", profileRoutes);

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
