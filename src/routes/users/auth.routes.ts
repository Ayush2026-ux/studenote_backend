import { Router } from "express";

// ================= AUTH CONTROLLERS =================
import { registerController } from "../../controllers/users/register.controller";
import { login } from "../../controllers/users/login.controller";
import { refreshTokenController } from "../../controllers/users/auth/refresh.controller";
import { verifyOtpController } from "../../controllers/users/verifyOtp.controller";
import { logout } from "../../controllers/users/logout.controller";
import { forgotPassword } from "../../controllers/users/forgotPassword.controller";
import { verifyForgotOtp } from "../../controllers/users/verifyForgotOtp.controller";
import { resetPassword } from "../../controllers/users/resetPassword.controller";
import { googleLogin } from "../../controllers/users/googlelogin.controller";
import { logoutAllDevices } from "../../controllers/users/logoutAll.controller";



// ================= MIDDLEWARE =================
import { authGuard } from "../../middlewares/auth.middleware";

// ================= PROFILE / PASSWORD =================
import { sendChangePasswordOtp } from "../../controllers/users/sendChangePasswordOtp.controller";
import { verifyChangePasswordOtp } from "../../controllers/users/verifyChangePasswordOtp.controller";
import { changePasswordAfterOtp } from "../../controllers/users/changePasswordAfterOtp.controller";
import { changePasswordController } from "../../controllers/users/changePassword.controller";
import { updateProfile } from "../../controllers/users/updateProfile.controller";

// ================= SESSIONS =================
import { getUserSessions } from "../../controllers/users/getSessions.controller";
import { getLoginActivity } from "../../controllers/users/getLoginActivity.controller";
import { revokeSession } from "../../controllers/users/revokeSession.controller";
import { clearLoginActivity } from "../../controllers/users/clearLoginActivity.controller";

// ================= LOGIN ALERT / ME =================
import { updateLoginAlert } from "../../controllers/users/updateLoginAlert.controller";
import { getMeController } from "../../controllers/users/me.controller";
import { savePushToken } from "../../controllers/users/push.controller";

// ================= AVATAR CONTROLLERS =================
import { uploadAvatarController } from "../../controllers/users/uploadAvatar.controller";
import { getAvatarController } from "../../controllers/users/getAvatar.controller";
import { uploadAvatar } from "../../middlewares/avatarUpload.middleware";

const router = Router();

/* ================= AUTH ================= */
router.post("/auth/google", googleLogin);
router.post("/register", registerController);
router.post("/login", login);
router.post("/refresh", refreshTokenController);
router.post("/verify-otp", verifyOtpController);
router.post("/logout", authGuard, logout);

/* ================= FORGOT / LOGIN PASSWORD ================= */
router.post("/forgot-password", forgotPassword);
router.post("/verify-forgot-otp", verifyForgotOtp);
router.post("/reset-password", changePasswordController); // LOGIN FLOW

/* ================= PROFILE ================= */
router.get("/me", authGuard, getMeController);
router.patch("/user/profile", authGuard, updateProfile);

/* ================= PROFILE CHANGE PASSWORD ================= */
router.post(
  "/user/change-password-otp",
  authGuard,
  sendChangePasswordOtp
);

// Verify OTP for changing password

router.post(
  "/user/verify-change-password-otp",
  authGuard,
  verifyChangePasswordOtp
);

// Change password after OTP verification

router.post(
  "/user/change-password",
  authGuard,
  changePasswordAfterOtp
);

// Logout from all devices

router.post(
  "/user/logout-all",
  authGuard,
  logoutAllDevices
);



/* ================= AVATAR ================= */
router.patch(
  "/user/avatar",
  authGuard,
  uploadAvatar,
  uploadAvatarController
);

router.get("/user/avatar/:id", getAvatarController);



/* ================= SESSIONS ================= */
router.get("/user/sessions", authGuard, getUserSessions);
router.get("/user/login-activity", authGuard, getLoginActivity);
router.post("/user/revoke-session/:sessionId", authGuard, revokeSession);
router.delete("/user/login-activity", authGuard, clearLoginActivity);

<<<<<<< HEAD
/* ================= LOGIN ALERT ================= */
router.patch("/user/login-alert", authGuard, updateLoginAlert);
=======
router.post("/users/push-token", authGuard, savePushToken);


>>>>>>> 9d460920aa6e04bf3e02186d825468c4ff30cf51

export default router;
