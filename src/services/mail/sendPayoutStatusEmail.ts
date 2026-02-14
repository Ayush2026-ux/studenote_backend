import { mailTransporter } from "../../config/mail";

type PayoutMailStatus = "approved" | "completed" | "rejected" | "failed";

export const sendPayoutStatusEmail = async ({
    to,
    userName,
    amount,
    netAmount,
    method,
    status,
    reason,
}: {
    to: string;
    userName: string;
    amount: number;
    netAmount: number;
    method: "upi" | "bank";
    status: PayoutMailStatus;
    reason?: string;
}) => {
    const subjectMap: Record<PayoutMailStatus, string> = {
        approved: "Your Studenote withdrawal is approved ⏳",
        completed: "Your Studenote withdrawal is successful ✅",
        rejected: "Your Studenote withdrawal was rejected ❌",
        failed: "Your Studenote withdrawal failed ⚠️",
    };

    const textMessageMap: Record<PayoutMailStatus, string> = {
        approved: `
Hi ${userName},

Your withdrawal request has been approved by our team ✅

Method: ${method.toUpperCase()}
Requested Amount: ₹${amount}
Amount to be received: ₹${netAmount}

Your payout is now being processed and will reach your account shortly.

Thanks for using Studenote 💙
Team Studenote
`,
        completed: `
Hi ${userName},

Good news! 🎉

Your withdrawal request has been successfully processed.

Method: ${method.toUpperCase()}
Requested Amount: ₹${amount}
Amount Received: ₹${netAmount}

If you have any questions, just reply to this email.

Thanks for using Studenote 💙
Team Studenote
`,
        rejected: `
Hi ${userName},

Unfortunately, your withdrawal request was rejected by our team.

Reason:
${reason || "Not specified"}

Please update your payment details and try again.

Thanks,
Team Studenote
`,
        failed: `
Hi ${userName},

Your withdrawal request failed due to a technical issue.

No amount has been deducted permanently.
Please try again later or contact support.

Thanks,
Team Studenote
`,
    };

    const htmlMessageMap: Record<PayoutMailStatus, string> = {
        approved: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>Hi ${userName},</h2>
        <p><b>Your withdrawal request has been approved ✅</b></p>
        <p>Your payout is now being processed and will reach your account shortly.</p>
        <div style="background:#f7f7f7;padding:12px;border-radius:8px;margin:12px 0;">
          <p><b>Method:</b> ${method.toUpperCase()}</p>
          <p><b>Requested Amount:</b> ₹${amount}</p>
          <p><b>Amount to be received:</b> ₹${netAmount}</p>
        </div>
        <p>Thanks for using <b>Studenote</b> 💙</p>
        <p>— Team Studenote</p>
      </div>
    `,
        completed: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>Hi ${userName},</h2>
        <p><b>Good news! 🎉</b></p>
        <p>Your withdrawal request has been <b>successfully processed</b>.</p>
        <div style="background:#f7f7f7;padding:12px;border-radius:8px;margin:12px 0;">
          <p><b>Method:</b> ${method.toUpperCase()}</p>
          <p><b>Requested Amount:</b> ₹${amount}</p>
          <p><b>Amount Received:</b> ₹${netAmount}</p>
        </div>
        <p>If you have any questions, just reply to this email.</p>
        <p>Thanks for using <b>Studenote</b> 💙</p>
        <p>— Team Studenote</p>
      </div>
    `,
        rejected: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>Hi ${userName},</h2>
        <p>Your withdrawal request was <b>rejected</b>.</p>
        <p><b>Reason:</b> ${reason || "Not specified"}</p>
        <p>Please update your payment details and try again.</p>
        <p>— Team Studenote</p>
      </div>
    `,
        failed: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>Hi ${userName},</h2>
        <p>Your withdrawal request <b>failed</b> due to a technical issue.</p>
        <p>No amount has been deducted permanently.</p>
        <p>Please try again later or contact support.</p>
        <p>— Team Studenote</p>
      </div>
    `,
    };

    await mailTransporter.sendMail({
        from: `"Studenote" <${process.env.SMTP_USER}>`,
        to,
        subject: subjectMap[status],
        text: textMessageMap[status],
        html: htmlMessageMap[status],
    });
};
