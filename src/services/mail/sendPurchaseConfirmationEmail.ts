import { mailTransporter } from "../../config/mail";

interface PurchaseConfirmationPayload {
    to: string;
    userName: string;
    noteName: string;
    noteAuthor: string;
    amount: number;
    platformFee: number;
    totalAmount: number;
    purchaseDate: Date;
    purchaseId: string;
}

export const sendPurchaseConfirmationEmail = async ({
    to,
    userName,
    noteName,
    noteAuthor,
    amount,
    platformFee,
    totalAmount,
    purchaseDate,
    purchaseId,
}: PurchaseConfirmationPayload) => {
    try {
        await mailTransporter.sendMail({
            from: `"Studenote" <${process.env.MAIL_USER}>`,
            to,
            subject: "✅ Purchase Confirmation - Studenote",
            html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333;">Thank you for your purchase! 🎉</h2>
          
          <p>Hi <b>${userName}</b>,</p>
          
          <p>Your payment has been successfully processed. Here are your purchase details:</p>
          
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px; font-weight: bold; color: #555;">Purchase ID:</td>
                <td style="padding: 8px; color: #333;">${purchaseId}</td>
              </tr>
              <tr style="background-color: #fff;">
                <td style="padding: 8px; font-weight: bold; color: #555;">Note:</td>
                <td style="padding: 8px; color: #333;">${noteName}</td>
              </tr>
              <tr>
                <td style="padding: 8px; font-weight: bold; color: #555;">Author:</td>
                <td style="padding: 8px; color: #333;">${noteAuthor}</td>
              </tr>
              <tr style="background-color: #fff;">
                <td style="padding: 8px; font-weight: bold; color: #555;">Amount:</td>
                <td style="padding: 8px; color: #333;">₹${amount.toFixed(2)}</td>
              </tr>
              <tr>
                <td style="padding: 8px; font-weight: bold; color: #555;">Platform Fee:</td>
                <td style="padding: 8px; color: #333;">₹${platformFee.toFixed(2)}</td>
              </tr>
              <tr style="background-color: #e8f5e9;">
                <td style="padding: 8px; font-weight: bold; color: #333;">Total Amount:</td>
                <td style="padding: 8px; font-weight: bold; color: #2e7d32;">₹${totalAmount.toFixed(2)}</td>
              </tr>
              <tr style="background-color: #fff;">
                <td style="padding: 8px; font-weight: bold; color: #555;">Date:</td>
                <td style="padding: 8px; color: #333;">${purchaseDate.toLocaleString()}</td>
              </tr>
            </table>
          </div>
          
          <p style="color: #666; font-size: 14px;">You can now access this note on your Studenote dashboard. Happy learning! 📚</p>
          
          <div style="margin-top: 30px; border-top: 1px solid #ddd; padding-top: 15px; color: #999; font-size: 12px;">
            <p>If you have any questions or need support, please contact our team.</p>
            <p style="margin-bottom: 0;">Best regards,<br/>The Studenote Team</p>
          </div>
        </div>
      `,
        });
        console.log("Purchase confirmation email sent to:", to);
    } catch (error) {
        console.error("Error sending purchase confirmation email:", error);
        throw error;
    }
};
