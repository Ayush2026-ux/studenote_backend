import nodemailer from "nodemailer";

export const mailTransporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false, // 587
  auth: {
    user: process.env.MAIL_USER,      // studenote3@gmail.com
    pass: process.env.MAIL_PASS,      // Gmail App Password
  },
  tls: {
    rejectUnauthorized: false,
  },
  pool: true,          // helps in prod
  maxConnections: 5,
  maxMessages: 100,
});
