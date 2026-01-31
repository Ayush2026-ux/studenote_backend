import { Router } from "express";
import { adminSignupController } from "../../controllers/admin/auth/signup.controller";
import { adminLogin } from "../../controllers/admin/auth/login.controller";
import { verifyOtpController } from "../../controllers/users/verifyOtp.controller";
import { LogoutController } from "../../controllers/admin/auth/logout.controller";

const router = Router();

/* ================= ADMIN AUTH ROUTES ================= */

// Admin Signup
router.post("/signup", adminSignupController);

// Admin Login (OTP Step 1)
router.post("/login", adminLogin);

//admin logout
router.post("/logout", LogoutController);

// Verify OTP (OTP Step 2) - Reuse user's OTP verification
router.post("/verify-otp", verifyOtpController);

export default router;
