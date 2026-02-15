// config/mail.ts
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

const ses = new SESClient({
  region: process.env.AWS_SES_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function sendEmail({
  from,
  to,
  subject,
  text,
  html,
  replyTo,
}: {
  from?: string;              // optional, fallback to SES_FROM_EMAIL
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  replyTo?: string;
}) {
  const ToAddresses = Array.isArray(to) ? to : [to];

  const command = new SendEmailCommand({
    Source: from || process.env.SES_FROM_EMAIL!,
    Destination: { ToAddresses },
    ReplyToAddresses: replyTo ? [replyTo] : undefined,
    Message: {
      Subject: { Data: subject, Charset: "UTF-8" },
      Body: {
        ...(html ? { Html: { Data: html, Charset: "UTF-8" } } : {}),
        ...(text ? { Text: { Data: text, Charset: "UTF-8" } } : {}),
      },
    },
  });

  return ses.send(command);
}
