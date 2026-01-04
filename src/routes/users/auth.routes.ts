import { Router } from "express";
import { registerController } from "../../controllers/users/register.controller";
import { login } from "../../controllers/users/login.controller";
import { verifyOtpController } from "../../controllers/users/verifyOtp.controller";
import { protect } from "../../middlewares/logout.middlewere";
import { logout } from "../../controllers/users/logout.controller";
import { forgotPassword } from "../../controllers/users/forgotPassword.controller";
import { verifyForgotOtp } from "../../controllers/users/verifyForgotOtp.controller";
import { resetPassword } from "../../controllers/users/resetPassword.controller";


const router = Router();

router.post("/forgot-password", forgotPassword);
router.post("/verify-forgot-otp", verifyForgotOtp);
router.post("/reset-password", resetPassword);


router.post("/register", registerController);
router.post("/login", login);
router.post("/verify-otp", verifyOtpController);
router.post("/logout", protect, logout);



export default router;
