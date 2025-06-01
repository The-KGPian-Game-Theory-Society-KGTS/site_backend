import { Router } from "express";
import teamController from "../controllers/team.controller.js";
import authMiddleware from "../middlewares/auth.middleware.js";

const router = Router();

// All team routes require authentication
router.use(authMiddleware.verifyJWT);

/**
 * @route POST /api/teams
 * @description Create a new team
 * @access Private
 */
router.post("/", teamController.createTeam);

/**
 * @route POST /api/teams/:teamId/join
 * @description Join an existing team
 * @access Private
 */
router.post("/:teamId/join", teamController.joinTeam);

/**
 * @route DELETE /api/teams/:teamId/leave
 * @description Leave a team
 * @access Private
 */
router.delete("/:teamId/leave", teamController.leaveTeam);

/**
 * @route GET /api/teams/event/:eventId
 * @description Get teams for an event
 * @access Private
 */
router.get("/event/:eventId", teamController.getEventTeams);

/**
 * @route GET /api/teams/user
 * @description Get user's teams
 * @access Private
 */
router.get("/user", teamController.getUserTeams);

export default router;
