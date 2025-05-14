import { Router } from "express";
import eventController from "../controllers/event.controller.js";
import authMiddleware from "../middlewares/auth.middleware.js";

const router = Router();

// Public routes
/**
 * @route GET /api/events
 * @description Get all events with optional status filter
 * @access Public
 */
router.get("/", eventController.getAllEvents);

// Authenticated routes
/**
 * @route GET /api/events/user/registered
 * @description Get user's registered events
 * @access Private
 */
router.get("/user/registered", authMiddleware.verifyJWT, eventController.getUserRegisteredEvents);

/**
 * @route GET /api/events/:id
 * @description Get a single event by ID
 * @access Public
 */
router.get("/:id", eventController.getEventById);

/**
 * @route POST /api/events/:id/register
 * @description Register for an event
 * @access Private
 */
router.post("/:id/register", authMiddleware.verifyJWT, eventController.registerForEvent);

// Admin routes
/**
 * @route POST /api/events
 * @description Create a new event
 * @access Admin
 */
router.post("/", authMiddleware.verifyJWT, authMiddleware.isAdmin, eventController.createEvent);

/**
 * @route PUT /api/events/:id
 * @description Update an event
 * @access Admin
 */
router.put("/:id", authMiddleware.verifyJWT, authMiddleware.isAdmin, eventController.updateEvent);

/**
 * @route DELETE /api/events/:id
 * @description Delete an event
 * @access Admin
 */
router.delete("/:id", authMiddleware.verifyJWT, authMiddleware.isAdmin, eventController.deleteEvent);

export default router; 