import { Router } from "express";
import { getUserProfile, updateUserProfile } from "../controllers/user.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

// Apply authentication middleware to all user routes
router.use(verifyJWT);

/**
 * @route GET /api/users/profile
 * @description Get user profile
 * @access Private
 */
router.get("/profile", getUserProfile);

/**
 * @route PUT /api/users/profile
 * @description Update user profile
 * @access Private
 */
router.put("/profile", updateUserProfile);

export default router; 