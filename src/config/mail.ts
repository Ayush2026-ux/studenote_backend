// config/mail.ts
import nodemailer from "nodemailer";

const isProd = process.env.NODE_ENV === "production";

const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST || "smtp.gmail.com",
  port: Number(process.env.MAIL_PORT) || 587,
  secure: false, // 587 -> false, 465 -> true
  auth: {
    user: process.env.MAIL_USER!,
    pass: process.env.MAIL_PASS!,
  },
  tls: {
    rejectUnauthorized: false,
  },
  pool: true,
  maxConnections: 5,
  maxMessages: 100,
  logger: !isProd,  // nodemailer internal logs (dev only)
  debug: !isProd,   // SMTP debug (dev only)
});

// Optional: verify transporter on startup
transporter.verify((err, success) => {
  if (err) {
    console.error("❌ Mail transporter verify failed:", err);
  } else if (!isProd) {
    console.log("✅ Mail transporter ready");
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
    });

    // Important: throw so API can return 500
    throw new Error("Failed to send email");
  }
}
