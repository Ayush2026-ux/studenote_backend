import nodemailer from "nodemailer";

interface LoginAlertPayload {
  to: string;
  device: string;
  ip: string;
  time: Date;
}

export const sendLoginAlertEmail = async ({
  to,
  device,
  ip,
  time,
}: LoginAlertPayload) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS,
    },
  });

  await transporter.sendMail({
    from: `"Studenote Security" <${process.env.MAIL_USER}>`,
    to,
    subject: "🔐 New Login Detected",
    html: `
      <h3>New login to your account</h3>
      <p><b>Device:</b> ${device}</p>
      <p><b>IP Address:</b> ${ip}</p>
      <p><b>Time:</b> ${time.toLocaleString()}</p>
      <p>If this wasn't you, change your password immediately.</p>
    `,
  });
};
