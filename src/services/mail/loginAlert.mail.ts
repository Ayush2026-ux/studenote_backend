import { sendEmail } from "../../config/mail";

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
  await sendEmail({
    from: `"Studenote Security" <${process.env.SES_FROM_EMAIL}>`,
    to,
    subject: "🔐 New Login Detected",
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h3>New login to your account</h3>
        <p><b>Device:</b> ${device}</p>
        <p><b>IP Address:</b> ${ip}</p>
        <p><b>Time:</b> ${new Date(time).toLocaleString()}</p>
        <p>If this wasn't you, change your password immediately.</p>
        <p>— Team Studenote</p>
      </div>
    `,
    text: `New login to your account
Device: ${device}
IP Address: ${ip}
Time: ${new Date(time).toLocaleString()}

If this wasn't you, change your password immediately.
— Team Studenote`,
    replyTo: "studenote3@gmail.com", // optional
  });
};
