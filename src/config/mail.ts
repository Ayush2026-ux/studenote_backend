import nodemailer from "nodemailer";

export const mailTransporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: Number(process.env.MAIL_PORT || 587),
  secure: false, // true only for 465
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS, // App Password if Gmail
  },
  tls: {
    rejectUnauthorized: false, // fixes SSL issues on many VPS/GoDaddy
  },
});
