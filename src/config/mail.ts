// config/mail.ts
import nodemailer from "nodemailer";

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
});

export async function sendEmail({
  from,
  to,
  subject,
  text,
  html,
  replyTo,
}: {
  from?: string;              // optional, fallback to MAIL_FROM
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  replyTo?: string;
}) {
  const mailOptions = {
    from: from || process.env.MAIL_FROM!,
    to: Array.isArray(to) ? to.join(",") : to,
    subject,
    text,
    html,
    replyTo,
  };

  return transporter.sendMail(mailOptions);
}


