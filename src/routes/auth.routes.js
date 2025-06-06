// routes/auth.routes.js
import { Router } from "express";
import authController from "../controllers/auth.controller.js";
import authMiddleware from "../middlewares/auth.middleware.js";
import { 
    authLimiter, 
    otpLimiter, 
    passwordResetLimiter 
} from "../middlewares/security.middleware.js";

const router = Router();

// Public routes with specific rate limiting
router.post("/register", authLimiter, authController.registerUser);
router.post("/verify-email", otpLimiter, authController.verifyEmail);
router.post("/resend-otp", otpLimiter, authController.resendOTP);
router.post("/login", authLimiter, authController.loginUser);
router.post("/forgot-password", passwordResetLimiter, authController.forgotPassword);
router.post("/reset-password", passwordResetLimiter, authController.resetPassword);
router.post("/refresh-token", authMiddleware.refreshAccessToken);

// Protected routes
router.post("/logout", authMiddleware.verifyJWT, authController.logoutUser);
router.post("/send-kgp-mail-otp", authMiddleware.verifyJWT, otpLimiter, authController.sendKgpMailVerificationOTP);
router.post("/verify-kgp-mail", authMiddleware.verifyJWT, otpLimiter, authController.verifyKgpMail);

export default router;
