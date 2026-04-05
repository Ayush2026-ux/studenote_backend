import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import path from "path";

import razorpayWebhookMiddleware from "./middlewares/razorpayWebhook.middleware";
import { handleAllWebhooks } from "./controllers/payments/webhooks.controller";
import { handlePayoutWebhook } from "./controllers/payments/payout.webhook";

/* ROUTES */

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
import sharesRoutes from "./routes/users/share.routes";
import profileRoutes from "./routes/users/profile.routes";

import adminRoutes from "./routes/admin/admin.routes";
import AdminModerationRoutes from "./routes/admin/moderation.routes";
import financeRoutes from "./routes/admin/earnings/finance.routes";
import socialRoutes from "./routes/admin/social/social.route";
import paymentRoutes from "./routes/payments/payment.routes";
import supportAdminRoutes from "./routes/admin/support/support.routes";
import dashboardRoutes from "./routes/admin/dashboard/dashboard.route";
import supportRoutes from "./routes/support/support.routes";
import walletRoutes from "./routes/payments/wallet.routes";
import earningsRoutes from "./routes/admin/payments/admin.earnings.routes";
import payotesRoutes from "./routes/admin/payments/admin.payout.routes";

import pdfViewerRoute from "./routes/utils/pdfViewer.route";

const app = express();

/* ===============================
   1️⃣ WEBHOOKS (RAW BODY FIRST)
================================ */

app.post(
  "/api/payments/webhook",
  express.raw({ type: "application/json" }),
  razorpayWebhookMiddleware,
  handleAllWebhooks
);

app.post(
  "/api/payouts/webhook",
  express.raw({ type: "application/json" }),
  razorpayWebhookMiddleware,
  handlePayoutWebhook
);

/* ===============================
   2️⃣ 🔥 GLOBAL MIDDLEWARES (CORS FIX)
================================ */

const allowedOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "https://www.studenote.co.in",
  "https://studenote.co.in",
];

app.use(
  cors({
    origin: function (origin, callback) {
      // allow mobile apps / Postman (no origin)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      } else {
        return callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

// 🔥 Preflight support
app.options("*", cors());

app.use(helmet());
app.use(morgan("dev"));

/* ===============================
   3️⃣ BODY PARSERS
================================ */

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

/* ===============================
   4️⃣ TRUST PROXY
================================ */

app.set("trust proxy", true);

/* ===============================
   5️⃣ HEALTH CHECK
================================ */

app.get("/", (_req, res) => {
  res.json({
    success: true,
    message: "Studenote Backend running 🚀",
  });
});

app.get("/health", (_req, res) => {
  res.send("OK");
});

/* ===============================
   6️⃣ ROUTES
================================ */

// Public
app.use("/api", authRoutes);

// Protected
app.use("/api", uploadRoutes);
app.use("/api/notes", home);
app.use("/api/users/profile", profileRoutes);

// Feed
app.use("/api/feeds", feedRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api/follow", followRoutes);
app.use("/api/save", saveRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/feedlikes", feedLikeRoutes);
app.use("/api/feedviews", feedViewRoutes);
app.use("/api/shares", sharesRoutes);

// Admin
app.use("/api/admin", adminRoutes);
app.use("/api/admin/moderation", AdminModerationRoutes);
app.use("/api/admin/social", socialRoutes);
app.use("/api/admin/finance", financeRoutes);
app.use("/api/admin/support", supportAdminRoutes);
app.use("/api/admin/analytics", dashboardRoutes);

// Payments
app.use("/api/payments", paymentRoutes);
app.use("/api/wallet", walletRoutes);
app.use("/api/payouts", payotesRoutes);
app.use("/api/earnings", earningsRoutes);

// Support
app.use("/api/support", supportRoutes);

/* ===============================
   PDF PREVIEW ROUTE
================================ */

app.use("/api", pdfViewerRoute);

/* ===============================
   STATIC FILES
================================ */

app.use("/public", express.static(path.join(__dirname, "../public")));

/* ===============================
   404 HANDLER
================================ */

app.use((_req, res) => {
  res.status(404).json({
    success: false,
    message: "Requested resource not found.",
  });
});

/* ===============================
   GLOBAL ERROR HANDLER
================================ */

app.use((err: any, _req: any, res: any, _next: any) => {
  console.error("GLOBAL ERROR:", err);

  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

export default app;