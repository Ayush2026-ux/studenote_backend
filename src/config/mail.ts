// config/mail.ts
import nodemailer from "nodemailer";

const isProd = process.env.NODE_ENV === "production";

// ENV switches (no code change needed later)
const MAIL_HOST = process.env.MAIL_HOST || "smtp.gmail.com"; // try: smtp-relay.gmail.com
const MAIL_PORT = Number(process.env.MAIL_PORT || 587);      // try: 465
const MAIL_SECURE = process.env.MAIL_SECURE === "true" || MAIL_PORT === 465;

const transporter = nodemailer.createTransport({
  host: MAIL_HOST,
  port: MAIL_PORT,
  secure: MAIL_SECURE, // true for 465, false for 587
  auth: {
    user: process.env.MAIL_USER!,
    pass: process.env.MAIL_PASS!,
  },
  tls: {
    rejectUnauthorized: false,
  },

  // Pooling (prod-friendly)
  pool: true,
  maxConnections: 5,
  maxMessages: 100,

  // Timeouts (helps with slow/blocked networks)
  connectionTimeout: 60_000,
  greetingTimeout: 30_000,
  socketTimeout: 60_000,

  // Debug (dev only)
  logger: !isProd,
  debug: !isProd,
});

// Optional: verify transporter on startup
transporter.verify((err) => {
  if (err) {
    console.error("❌ Mail transporter verify failed:", {
      message: err?.message,
      code: (err as any)?.code,
      host: MAIL_HOST,
      port: MAIL_PORT,
      secure: MAIL_SECURE,
    });
  } else if (!isProd) {
    console.log("✅ Mail transporter ready", {
      host: MAIL_HOST,
      port: MAIL_PORT,
      secure: MAIL_SECURE,
    });
  }
});

export async function sendEmail({
  from,
  to,
  subject,
  text,
  html,
  replyTo,
}: {
  from?: string;
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  replyTo?: string;
}) {
  try {
    const mailOptions = {
      from: from || process.env.MAIL_FROM!,
      to: Array.isArray(to) ? to.join(",") : to,
      subject,
      text,
      html,
      replyTo,
    };

    if (!isProd) {
      console.log("📤 Sending email:", {
        to: mailOptions.to,
        subject: mailOptions.subject,
        via: { host: MAIL_HOST, port: MAIL_PORT, secure: MAIL_SECURE },
      });
    }

    const info = await transporter.sendMail(mailOptions);

    if (!isProd) {
      console.log("✅ Email sent:", {
        messageId: info.messageId,
        response: info.response,
      });
    }

    return info;
  } catch (error: any) {
    console.error("❌ sendEmail failed:", {
      message: error?.message,
      code: error?.code,
      response: error?.response,
      via: { host: MAIL_HOST, port: MAIL_PORT, secure: MAIL_SECURE },
    });
    throw new Error("Failed to send email");
  }
}
