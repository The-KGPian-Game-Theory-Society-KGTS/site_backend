import { Router } from "express";
import riddleController from "../controllers/riddle.controller.js";
import authMiddleware from "../middlewares/auth.middleware.js";

const router = Router();

// Public routes
/**
 * @route GET /api/riddles
 * @description Get all riddles with optional status filter
 * @access Public
 */
router.get("/", riddleController.getAllRiddles);

/**
 * @route GET /api/riddles/:riddleId
 * @description Get a single riddle by ID
 * @access Public
 */
router.get("/:riddleId", riddleController.getRiddleById);

/**
 * @route GET /api/riddles/:riddleId/leaderboard
 * @description Get riddle leaderboard (only if admin enabled)
 * @access Public
 */
router.get("/:riddleId/leaderboard", riddleController.getRiddleLeaderboard);

/**
 * @route GET /api/riddles/leaderboard/total
 * @description Get total leaderboard (always visible)
 * @access Public
 */
router.get("/leaderboard/total", riddleController.getTotalLeaderboard);

// Authenticated routes
/**
 * @route POST /api/riddles/:riddleId/submit
 * @description Submit response to a riddle
 * @access Private
 */
router.post("/:riddleId/submit", authMiddleware.verifyJWT, riddleController.submitResponse);

/**
 * @route GET /api/riddles/user/responses
 * @description Get user's submitted responses
 * @access Private
 */
router.get("/user/responses", authMiddleware.verifyJWT, riddleController.getUserResponses);

// Admin routes
/**
 * @route POST /api/riddles
 * @description Create a new riddle
 * @access Admin
 */
router.post("/", authMiddleware.verifyJWT, authMiddleware.isAdmin, riddleController.createRiddle);

/**
 * @route PUT /api/riddles/:riddleId
 * @description Update a riddle
 * @access Admin
 */
router.put("/:riddleId", authMiddleware.verifyJWT, authMiddleware.isAdmin, riddleController.updateRiddle);

/**
 * @route DELETE /api/riddles/:riddleId
 * @description Delete a riddle
 * @access Admin
 */
router.delete("/:riddleId", authMiddleware.verifyJWT, authMiddleware.isAdmin, riddleController.deleteRiddle);

/**
 * @route GET /api/riddles/:riddleId/responses
 * @description Get all responses for a riddle
 * @access Admin
 */
router.get("/:riddleId/responses", authMiddleware.verifyJWT, authMiddleware.isAdmin, riddleController.getRiddleResponses);

/**
 * @route PUT /api/riddles/responses/:responseId/scoring
 * @description Update response scoring
 * @access Admin
 */
router.put("/responses/:responseId/scoring", authMiddleware.verifyJWT, authMiddleware.isAdmin, riddleController.updateResponseScoring);

/**
 * @route PUT /api/riddles/:riddleId/bulk-scoring
 * @description Bulk update response scoring
 * @access Admin
 */
router.put("/:riddleId/bulk-scoring", authMiddleware.verifyJWT, authMiddleware.isAdmin, riddleController.bulkUpdateScoring);

/**
 * @route PUT /api/riddles/:riddleId/toggle-leaderboard
 * @description Toggle riddle leaderboard visibility
 * @access Admin
 */
router.put("/:riddleId/toggle-leaderboard", authMiddleware.verifyJWT, authMiddleware.isAdmin, riddleController.toggleLeaderboardVisibility);

export default router;
