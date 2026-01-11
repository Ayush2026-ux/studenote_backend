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
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  await transporter.sendMail({
    from: `"Studenote Security" <${process.env.EMAIL_USER}>`,
    to,
    subject: "🔐 New Login Detected",
    html: `
      <h3>New Login Alert</h3>
      <p>A new login was detected on your account.</p>
      <ul>
        <li><b>Device:</b> ${device}</li>
        <li><b>IP Address:</b> ${ip}</li>
        <li><b>Time:</b> ${time.toLocaleString()}</li>
      </ul>
      <p>If this wasn't you, please change your password immediately.</p>
    `,
  });
};
