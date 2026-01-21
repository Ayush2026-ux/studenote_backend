import { mailTransporter } from "../../config/mail";

/* =====================================================
   LOGIN / REGISTER / FORGOT PASSWORD OTP MAIL
===================================================== */

export const sendOtpMail = async (email: string, otp: string) => {
  await mailTransporter.sendMail({
    from: process.env.MAIL_FROM,
    to: email,
    subject: "🔐 Your Studenotes Login Code",
    html: `
      <div style="background:#f3f4f6;padding:40px 0;
        font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial;">
        
        <div style="max-width:420px;margin:auto;background:#ffffff;
          border-radius:18px;padding:30px;
          box-shadow:0 12px 30px rgba(0,0,0,0.12);">

          <div style="text-align:center;">
            <div style="font-size:40px;">🔐</div>
            <h2 style="margin:8px 0;color:#0f172a;">Studenotes</h2>
            <p style="color:#6b7280;font-size:14px;">
              Secure Login Verification
            </p>
          </div>

          <div style="margin:24px 0;
            background:linear-gradient(135deg,#3b82f6,#06b6d4);
            border-radius:14px;
            padding:20px;
            text-align:center;
            color:white;">
            
            <p style="margin:0;font-size:13px;">Your OTP Code</p>
            <div style="
              font-size:34px;
              letter-spacing:6px;
              font-weight:700;
              margin-top:10px;">
              ${otp}
            </div>
          </div>

          <p style="font-size:14px;color:#374151;line-height:1.6;">
            ⏳ This OTP is valid for <strong>5 minutes</strong>.  
            Please don’t share it with anyone.
          </p>

          <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">

          <p style="font-size:12px;color:#9ca3af;text-align:center;">
            If you didn’t request this, ignore this email.<br/>
            — Team <strong>Studenotes</strong> 💙
          </p>
        </div>
      </div>
    `,
  });
};

/* =====================================================
   CHANGE PASSWORD OTP MAIL
===================================================== */

export const sendChangePasswordOtpMail = async (
  email: string,
  otp: string
) => {
  await mailTransporter.sendMail({
    from: process.env.MAIL_FROM,
    to: email,
    subject: "🔒 Studenotes Password Change OTP",
    html: `
      <div style="background:#f8fafc;padding:40px 0;
        font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial;">
        
        <div style="max-width:420px;margin:auto;background:#ffffff;
          border-radius:18px;padding:30px;
          box-shadow:0 12px 30px rgba(0,0,0,0.12);">

          <div style="text-align:center;">
            <div style="font-size:42px;">🔒</div>
            <h2 style="margin:8px 0;color:#0f172a;">Studenotes</h2>
            <p style="color:#6b7280;font-size:14px;">
              Password Change Verification
            </p>
          </div>

          <div style="margin:24px 0;
            background:linear-gradient(135deg,#ef4444,#f97316);
            border-radius:14px;
            padding:20px;
            text-align:center;
            color:white;">
            
            <p style="margin:0;font-size:13px;">Your Password Change OTP</p>
            <div style="
              font-size:34px;
              letter-spacing:6px;
              font-weight:700;
              margin-top:10px;">
              ${otp}
            </div>
          </div>

          <p style="font-size:14px;color:#374151;line-height:1.6;">
            ⏳ This OTP is valid for <strong>10 minutes</strong>.  
            If you did not request a password change, please secure your account immediately.
          </p>

          <div style="margin-top:18px;
            background:#fff7ed;
            border-left:4px solid #f97316;
            padding:12px;
            font-size:13px;
            color:#7c2d12;">
            ⚠️ Never share this OTP with anyone.
          </div>

          <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">

          <p style="font-size:12px;color:#9ca3af;text-align:center;">
            If this wasn’t you, please contact support.<br/>
            — Team <strong>Studenotes</strong> 🛡️
          </p>
        </div>
      </div>
    `,
  });
};
