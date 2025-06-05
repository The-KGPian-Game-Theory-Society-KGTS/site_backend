// routes/auth.routes.js
import { Router } from "express";
import authController from "../controllers/auth.controller.js";
import authMiddleware from "../middlewares/auth.middleware.js";

const router = Router();

// Public routes
router.post("/register", authController.registerUser);
router.post("/verify-email", authController.verifyEmail);
router.post("/resend-otp", authController.resendOTP);
router.post("/login", authController.loginUser);
router.post("/forgot-password", authController.forgotPassword);
router.post("/reset-password", authController.resetPassword);
router.post("/refresh-token", authMiddleware.refreshAccessToken);

// Protected routes
router.post("/logout", authMiddleware.verifyJWT, authController.logoutUser);
// router.post("/send-phone-otp", authMiddleware.verifyJWT, authController.sendPhoneVerificationOTP);
// router.post("/verify-phone", authMiddleware.verifyJWT, authController.verifyPhoneNumber);
router.post("/send-kgp-mail-otp", authMiddleware.verifyJWT, authController.sendKgpMailVerificationOTP);
router.post("/verify-kgp-mail", authMiddleware.verifyJWT, authController.verifyKgpMail);

export default router;
