import { sendEmail } from "../../config/mail";

interface ApprovalEmailParams {
    userEmail: string;
    userName: string;
    noteTitle: string;
}

export const sendNoteApprovalEmail = async ({
    userEmail,
    userName,
    noteTitle,
}: ApprovalEmailParams): Promise<void> => {
    try {
        const mailOptions = {
            from: process.env.MAIL_FROM,
            to: userEmail,
            subject: " Your Note Has Been Approved - StudentNote",
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
                        <h1 style="color: white; margin: 0;">🎉 Great News!</h1>
                    </div>
                    
                    <div style="padding: 30px; background: #f9f9f9; border: 1px solid #ddd; border-radius: 0 0 8px 8px;">
                        <p style="font-size: 16px; color: #333;">Hi <strong>${userName}</strong>,</p>
                        
                        <div style="background: #d4edda; border-left: 4px solid #28a745; padding: 15px; margin: 20px 0; border-radius: 4px;">
                            <p style="margin: 0; color: #155724;">
                                <strong>Status:</strong> Your note has been <span style="color: #28a745; font-weight: bold;">✅ APPROVED</span>
                            </p>
                        </div>

                        <p style="font-size: 14px; color: #666;"><strong>Note Title:</strong></p>
                        <p style="font-size: 15px; color: #333; padding: 10px; background: white; border-left: 3px solid #667eea;">"${noteTitle}"</p>

                        <div style="background: #e8f5e9; padding: 15px; border-radius: 4px; margin: 20px 0;">
                            <p style="margin: 0; color: #2e7d32; line-height: 1.6;">
                                <strong>🎊 Your note is now live!</strong><br>
                                Your note is now visible to other students on StudentNote and can be purchased. Thank you for contributing quality educational content to our community!
                            </p>
                        </div>

                        <div style="background: #f0f8ff; padding: 15px; border-radius: 4px; margin: 20px 0; border: 1px solid #b3d9ff;">
                            <p style="margin: 0; color: #0c3d6b; font-size: 14px;">
                                <strong>📊 What happens next:</strong><br>
                                • Your note will appear in search results<br>
                                • Students can view and purchase your note<br>
                                • You'll earn revenue from each purchase<br>
                                • Check your dashboard for analytics
                            </p>
                        </div>

                        <p style="font-size: 13px; color: #999; margin-top: 25px;">
                            Keep creating quality content! If you have questions, contact our support team.
                        </p>
                    </div>

                    <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
                        <p style="margin: 0;">© 2024 StudentNote. All rights reserved.</p>
                    </div>
                </div>
            `,
        };

        await sendEmail(mailOptions);
        console.log(`✅ Approval email sent to ${userEmail}`);
    } catch (error) {
        console.error("❌ Error sending approval email:", error);
        throw error;
    }
};
