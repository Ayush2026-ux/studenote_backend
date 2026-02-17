// config/mail.ts
import axios from "axios";

const isProd = process.env.NODE_ENV === "production";

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
    const recipients = Array.isArray(to) ? to : [to];

    const senderEmail = from || process.env.MAIL_FROM || "no-reply@studenote.co.in";

    const payload = {
      sender: {
        email: senderEmail,
        name: "StudeNote",
      },
      to: recipients.map((email) => ({ email })),
      subject,
      htmlContent: html || undefined,
      textContent: text || undefined,
      replyTo: replyTo ? { email: replyTo } : undefined,
    };

    const API_KEY = process.env.BREVO_API_KEY;
    if (!API_KEY) {
      throw new Error("Brevo API key is not configured");
    }
    const res = await axios.post("https://api.brevo.com/v3/smtp/email", payload, {
      headers: {
        "api-key": API_KEY,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      timeout: 30_000,
    });



    if (!isProd) {
      console.log(" Brevo email sent:", {
        messageId: res.data?.messageId,
        to: recipients,
        subject,
      });
    }

    return res.data;
  } catch (error: any) {
    console.error("Brevo sendEmail failed:", {
      message: error?.message,
      status: error?.response?.status,
      data: error?.response?.data,
    });
    throw new Error("Failed to send email");
  }
}
