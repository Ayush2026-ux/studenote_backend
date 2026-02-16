import { sendEmail } from "../../config/mail";

interface RejectionEmailParams {
    userEmail: string;
    userName: string;
    noteTitle: string;
    rejectionReason: string;
}

export const sendNoteRejectionEmail = async ({
    userEmail,
    userName,
    noteTitle,
    rejectionReason,
}: RejectionEmailParams): Promise<void> => {
    try {
        const mailOptions = {
            from: process.env.MAIL_FROM,
            to: userEmail,
            subject: "📋 Your Note Has Been Rejected - StudentNote",
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
                        <h1 style="color: white; margin: 0;">Note Review Update</h1>
                    </div>
                    
                    <div style="padding: 30px; background: #f9f9f9; border: 1px solid #ddd; border-radius: 0 0 8px 8px;">
                        <p style="font-size: 16px; color: #333;">Hi <strong>${userName}</strong>,</p>
                        
                        <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px;">
                            <p style="margin: 0; color: #856404;">
                                <strong>Status:</strong> Your note has been <span style="color: #d9534f;">REJECTED</span>
                            </p>
                        </div>

                        <p style="font-size: 14px; color: #666;"><strong>Note Title:</strong></p>
                        <p style="font-size: 15px; color: #333; padding: 10px; background: white; border-left: 3px solid #667eea;">"${noteTitle}"</p>

                        <p style="font-size: 14px; color: #666; margin-top: 20px;"><strong>Rejection Reason:</strong></p>
                        <div style="background: white; padding: 15px; border-radius: 4px; border: 1px solid #ddd; color: #333;">
                            <p style="margin: 0; line-height: 1.6;">${rejectionReason}</p>
                        </div>

                        <div style="background: #e8f4f8; padding: 15px; border-radius: 4px; margin: 20px 0;">
                            <p style="margin: 0; color: #0c5460;">
                                <strong>ℹ️ Next Steps:</strong><br>
                                You can review the feedback above and resubmit an improved version of your note. Please ensure all content complies with our guidelines before resubmitting.
                            </p>
                        </div>

                        <p style="font-size: 13px; color: #999; margin-top: 25px;">
                            If you have any questions about this decision, please contact our support team.
                        </p>
                    </div>

                    <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
                        <p style="margin: 0;">© 2024 StudentNote. All rights reserved.</p>
                    </div>
                </div>
            `,
        };

        await sendEmail(mailOptions);
        console.log(`✅ Rejection email sent to ${userEmail}`);
    } catch (error) {
        console.error("❌ Error sending rejection email:", error);
        throw error;
    }
};
