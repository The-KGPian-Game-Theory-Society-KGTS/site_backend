import { Router } from "express";
import { 
    registerUser, 
    verifyEmail, 
    resendOTP, 
    loginUser, 
    logoutUser
} from "../controllers/auth.controller.js";
import { verifyJWT, refreshAccessToken } from "../middlewares/auth.middleware.js";

const router = Router();

// Debug route to check the request body
router.post("/debug", (req, res) => {
    console.log("DEBUG REQUEST HEADERS:", req.headers);
    console.log("DEBUG REQUEST BODY:", req.body);
    res.status(200).json({
        message: "Debug info logged to console",
        receivedBody: req.body,
        contentType: req.headers['content-type']
    });
});

// Test endpoint that specifically handles text/plain JSON
router.post("/test-plain-json", (req, res) => {
    console.log("TEST ENDPOINT - Headers:", req.headers);
    console.log("TEST ENDPOINT - Body:", req.body);
    console.log("TEST ENDPOINT - Raw Body:", req.rawBody);
    
    let data = req.body;
    
    // If body is empty or not an object but we have raw body
    if ((!req.body || typeof req.body !== 'object' || !Object.keys(req.body).length) && req.rawBody) {
        try {
            data = JSON.parse(req.rawBody);
            console.log("TEST ENDPOINT - Parsed from raw:", data);
        } catch (err) {
            console.error("TEST ENDPOINT - Parse error:", err);
        }
    }
    
    return res.status(200).json({
        success: true,
        message: "Test endpoint response",
        receivedBody: req.body,
        parsedFromRaw: data,
        email: data.email,
        otp: data.otp
    });
});

/**
 * @route POST /api/auth/register
 * @description Register a new user
 * @access Public 
 */
router.post("/register", registerUser);

/**
 * @route POST /api/auth/verify-email
 * @description Verify user email with OTP
 * @access Public
 */
router.post("/verify-email", verifyEmail);

/**
 * @route POST /api/auth/resend-otp
 * @description Resend OTP for email verification
 * @access Public
 */
router.post("/resend-otp", resendOTP);

/**
 * @route POST /api/auth/login
 * @description Login with email and password
 * @access Public
 */
router.post("/login", loginUser);

/**
 * @route POST /api/auth/refresh-token
 * @description Refresh access token
 * @access Public (with refresh token)
 */
router.post("/refresh-token", refreshAccessToken);

/**
 * @route POST /api/auth/logout
 * @description Logout user
 * @access Private
 */
router.post("/logout", verifyJWT, logoutUser);

export default router; 