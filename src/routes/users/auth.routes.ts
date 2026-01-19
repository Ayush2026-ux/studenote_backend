import { Router } from "express";

// Auth controllers
import { registerController } from "../../controllers/users/register.controller";
import { login } from "../../controllers/users/login.controller";
import { refreshTokenController } from "../../controllers/users/auth/refresh.controller";
import { verifyOtpController } from "../../controllers/users/verifyOtp.controller";
import { protect } from "../../middlewares/logout.middlewere";
import { logout } from "../../controllers/users/logout.controller";
import { forgotPassword } from "../../controllers/users/forgotPassword.controller";
import { verifyForgotOtp } from "../../controllers/users/verifyForgotOtp.controller";
import { resetPassword } from "../../controllers/users/resetPassword.controller";
import { googleLogin } from "../../controllers/users/googlelogin.controller";

// Upload / Admin

import { adminAuth } from "../../middlewares/adminAuth.middleware";
import { authGuard } from "../../middlewares/auth.middleware";

import { sendChangePasswordOtp } from "../../controllers/users/sendChangePasswordOtp.controller";
import { changePasswordController } from "../../controllers/users/changePassword.controller";
import { updateProfile } from "../../controllers/users/updateProfile.controller";


// Sessions & Login Activity

import { getUserSessions } from "../../controllers/users/getSessions.controller";
import { getLoginActivity } from "../../controllers/users/getLoginActivity.controller";
import { revokeSession } from "../../controllers/users/revokeSession.controller";
import { clearLoginActivity } from "../../controllers/users/clearLoginActivity.controller";





// Login Alert Settings
import { updateLoginAlert } from "../../controllers/users/updateLoginAlert.controller";
import { getMeController } from "../../controllers/users/me.controller";
import { savePushToken } from "../../controllers/users/push.controller";

const router = Router();

/* ---------------- AUTH ROUTES ---------------- */
router.post("/auth/google", googleLogin);
router.post("/forgot-password", forgotPassword);
router.post("/verify-forgot-otp", verifyForgotOtp);
router.post("/reset-password", resetPassword);


router.post("/register", registerController);
router.post("/login", login);
router.post("/refresh", refreshTokenController);
router.post("/verify-otp", verifyOtpController);
router.post("/logout", authGuard, logout);


/* ---------------- SESSIONS & LOGIN ACTIVITY ---------------- */

router.get("/user/sessions", authGuard, getUserSessions);
router.get("/user/login-activity", authGuard, getLoginActivity);
router.post("/user/revoke-session/:sessionId", authGuard, revokeSession);


/* -------- PROFILE UPDATE -------- */
router.patch(
  "/user/profile",
  authGuard,
  updateProfile
);

/* -------- PASSWORD UPDATE -------- */
router.post(
  "/user/change-password-otp",
  authGuard,
  sendChangePasswordOtp
);

router.post(
  "/user/change-password",
  authGuard,
  changePasswordController
);

/* -------- LOGIN ALERT SETTINGS -------- */
router.patch(
  "/user/login-alert",
  authGuard,
  updateLoginAlert
);




/* -------- CURRENT USER -------- */

router.get("/me", authGuard, getMeController);


/* -------- LOGIN ACTIVITY -------- */
router.delete(
  "/user/login-activity",
  authGuard,
  clearLoginActivity
);

router.post("/users/push-token", authGuard, savePushToken);



export default router;
