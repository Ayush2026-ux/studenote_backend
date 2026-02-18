import axios from "axios";
import aws4 from "aws4";

const API_HOST = "atihvjt3u8.execute-api.ap-south-1.amazonaws.com";
const API_PATH = "/dev/sendEmail";
const REGION = "ap-south-1";
const SERVICE = "execute-api";

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
  const recipients = Array.isArray(to) ? to : [to];

  const body = {
    to: recipients,
    subject,
    text,
    html,
    replyTo,
    // don't pass `from` from client; sender is fixed in Lambda
  };

  const request = {
    host: API_HOST,
    path: API_PATH,
    service: SERVICE,
    region: REGION,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  };

  // 🔐 Sign with IAM credentials (set these in env on your backend)
  aws4.sign(request, {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    sessionToken: process.env.AWS_SESSION_TOKEN, // optional (if using STS)
  });

  const res = await axios({
    method: request.method,
    url: `https://${API_HOST}${API_PATH}`,
    headers: request.headers,
    data: request.body,
    timeout: 10_000,
  });

  return res.data;
}
