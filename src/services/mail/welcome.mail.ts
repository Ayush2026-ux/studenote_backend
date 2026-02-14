import { mailTransporter } from "../../config/mail";

export const sendWelcomeMail = async (
  email: string,
  fullName: string
): Promise<void> => {
  await mailTransporter.sendMail({
    from: process.env.MAIL_FROM,
    to: email,
    subject: `🎉 Welcome to Studenotes, ${fullName}!`,
    html: `
      <div style="background:#f3f4f6;padding:40px 0;
        font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial;">
        
        <div style="max-width:520px;margin:auto;background:#ffffff;
          border-radius:20px;padding:32px;
          box-shadow:0 14px 35px rgba(0,0,0,0.12);">

          <div style="text-align:center;">
            <div style="font-size:44px;">🎓</div>
            <h2 style="margin:8px 0;color:#0f172a;">Welcome to Studenotes</h2>
            <p style="color:#6b7280;font-size:14px;">
              Smart learning starts here 🚀
            </p>
          </div>

          <h3 style="margin-top:26px;color:#111827;">
            Hi ${fullName} 👋
          </h3>

          <p style="font-size:14px;color:#374151;line-height:1.7;">
            We’re super excited to have you onboard!  
            Studenotes is built to help students learn smarter,
            share quality notes, and grow together 📚✨
          </p>

          <!-- Feature Cards -->
          <div style="margin:24px 0;">
            <div style="background:#eff6ff;padding:14px 16px;
              border-radius:12px;margin-bottom:12px;font-size:14px;">
              📖 Explore high-quality study notes
            </div>

            <div style="background:#ecfeff;padding:14px 16px;
              border-radius:12px;margin-bottom:12px;font-size:14px;">
              ✍️ Share your notes with the community
            </div>

            <div style="background:#f5f3ff;padding:14px 16px;
              border-radius:12px;font-size:14px;">
              🤝 Connect with fellow learners
            </div>
          </div>

          <!-- CTA Button -->
          <div style="text-align:center;margin:28px 0;">
            <a style="
              background:linear-gradient(135deg,#6366f1,#8b5cf6);
              color:white;
              text-decoration:none;
              padding:14px 26px;
              border-radius:12px;
              font-size:15px;
              font-weight:600;
              display:inline-block;">
              🚀 Start Learning Now
            </a>
          </div>

          <hr style="border:none;border-top:1px solid #e5e7eb;margin:26px 0;">

          <p style="font-size:13px;color:#6b7280;text-align:center;">
            Need help? Just reply to this mail 💌<br/><br/>
            — Team <strong>Studenotes</strong> 💙
          </p>
        </div>
      </div>
    `,
  });
};
