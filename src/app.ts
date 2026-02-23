import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

import razorpayWebhookMiddleware from "./middlewares/razorpayWebhook.middleware";
import { handleAllWebhooks } from "./controllers/payments/webhooks.controller";

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
//import refundAdminRoutes from "./routes/admin/refund.routes";
import supportRoutes from "./routes/support/support.routes";
import { handlePayoutWebhook } from "./controllers/payments/payout.webhook";
import walletRoutes from "./routes/payments/wallet.routes";
import earningsRoutes from "./routes/admin/payments/admin.earnings.routes";
import payotesRoutes from "./routes/admin/payments/admin.payout.routes";
import path from "path/win32";






const app = express();

/* ===============================
   1️ RAZORPAY WEBHOOK (RAW BODY)
   MUST COME FIRST
================================ */

app.post(
  "/api/payments/webhook",
  express.raw({ type: "application/json" }),
  razorpayWebhookMiddleware,
  handleAllWebhooks,
);

app.post(
  "/api/payouts/webhook",
  express.raw({ type: "application/json" }),
  razorpayWebhookMiddleware,
  handlePayoutWebhook
);

/* ===============================
   2 GLOBAL MIDDLEWARES
================================ */
const allowedOrigins = [
  "https://www.studenote.co.in",
  "https://studenote.co.in",
  "http://localhost:3000",
  "http://localhost:19006",
];

if (process.env.ORIGIN_URL) {
  allowedOrigins.push(process.env.ORIGIN_URL);
}

const corsOptions = {
  origin: (origin: any, callback: (err: any, allow: boolean) => void) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"), false);
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  credentials: true,

  // IMPORTANT FIX
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "cache-control",
  ],
};

//  Apply globally
app.use(cors(corsOptions));

//  Preflight fix (IMPORTANT for Railway / production)
//app.options("*", cors(corsOptions));
app.use(helmet());
app.use(morgan("dev"));

/* ===============================
   3 BODY PARSERS (AFTER WEBHOOK)
================================ */

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));


/* ===============================
   4 TRUST PROXY
================================ */

app.set("trust proxy", true);

/* ===============================
   5 TIMEOUT MIDDLEWARE
================================ */

app.use((req, res, next) => {
  if (req.path.includes("/upload")) {
    req.setTimeout(1800000);
    res.setTimeout(1800000);
  }
  next();
});

/* ===============================
   6 HEALTH & ROOT
================================ */

app.get("/", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "Studenote Backend is running 🚀",
  });
});

app.get("/health", (_req, res) => {
  res.status(200).send("OK");
});

/* ===============================
   7 ROUTES
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



//app.use("/api/admin/refunds", refundAdminRoutes);

// Payments (NORMAL JSON ROUTES)
app.use("/api/payments", paymentRoutes);
app.use("/api/wallet", walletRoutes); // For wallet-related routes
app.use("/api/payouts", payotesRoutes); // For admin payment routes
app.use("/api/earnings", earningsRoutes);


app.use("/public", express.static(path.join(__dirname, "../public")));


// Support
app.use("/api/support", supportRoutes);

app.get("/api", (_req, res) => {
  res.json({ message: "API running" });
});

/* ===============================
   8 404 HANDLER
================================ */

app.use((_req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

/* ===============================
   9 GLOBAL ERROR HANDLER
================================ */

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
