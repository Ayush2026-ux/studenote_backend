import { Router } from "express";

// Auth controllers
import { registerController } from "../../controllers/users/register.controller";
import { login } from "../../controllers/users/login.controller";
import { verifyOtpController } from "../../controllers/users/verifyOtp.controller";
import { protect } from "../../middlewares/logout.middlewere";
import { logout } from "../../controllers/users/logout.controller";
import { forgotPassword } from "../../controllers/users/forgotPassword.controller";
import { verifyForgotOtp } from "../../controllers/users/verifyForgotOtp.controller";
import { resetPassword } from "../../controllers/users/resetPassword.controller";

// Upload / Admin
import { upload } from "../../middlewares/multer";
import { uploadFile } from "../../controllers/users/upload.controller";
import { deleteFile } from "../../controllers/users/delete.controller";
import { adminAuth } from "../../middlewares/adminAuth.middleware";

const router = Router();

router.post("/forgot-password", forgotPassword);
router.post("/verify-forgot-otp", verifyForgotOtp);
router.post("/reset-password", resetPassword);


router.post("/register", registerController);
router.post("/login", login);
router.post("/verify-otp", verifyOtpController);
router.post("/logout", protect, logout);



/* ---------------- NOTES UPLOAD ---------------- */
// 🔥 THIS IS THE IMPORTANT FIX
router.post(
  "/notes",
  upload.single("file"),
  uploadFile
);

/* ---------------- ADMIN ---------------- */
router.delete(
  "/admin/delete-file",
  adminAuth,
  deleteFile
);

export default router;
