import { Router } from "express";
import authController from "../controllers/auth.controller.js";
import authMiddleware from "../middlewares/auth.middleware.js";

const router = Router();

/**
 * @route POST /api/auth/register
 * @description Register a new user
 * @access Public 
 */
// Main routes
/**
 * @route POST /api/auth/register
 * @description Register a new user
 * @access Public
 */
router.post("/register", authController.registerUser);

/**
 * @route POST /api/auth/verify-email
 * @description Verify user email with OTP
 * @access Public
 */
router.post("/verify-email", authController.verifyEmail);

/**
 * @route POST /api/auth/resend-otp
 * @description Resend OTP for email verification
 * @access Public
 */
router.post("/resend-otp", authController.resendOTP);

/**
 * @route POST /api/auth/login
 * @description Login with email and password
 * @access Public
 */
router.post("/login", authController.loginUser);

/**
 * @route POST /api/auth/refresh-token
 * @description Refresh access token
 * @access Public (with refresh token)
 */
router.post("/refresh-token", authMiddleware.refreshAccessToken);

/**
 * @route POST /api/auth/logout
 * @description Logout user
 * @access Private
 */
router.post("/logout", authMiddleware.verifyJWT, authController.logoutUser);

export default router; 