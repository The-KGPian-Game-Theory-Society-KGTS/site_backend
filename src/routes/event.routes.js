import { Router } from "express";
import { 
    createEvent, 
    updateEvent, 
    deleteEvent, 
    getAllEvents, 
    getEventById,
    registerForEvent,
    getUserRegisteredEvents
} from "../controllers/event.controller.js";
import { verifyJWT, isAdmin } from "../middlewares/auth.middleware.js";

const router = Router();

// Public routes
/**
 * @route GET /api/events
 * @description Get all events with optional status filter
 * @access Public
 */
router.get("/", getAllEvents);

// Authenticated routes
/**
 * @route GET /api/events/user/registered
 * @description Get user's registered events
 * @access Private
 */
router.get("/user/registered", verifyJWT, getUserRegisteredEvents);

/**
 * @route GET /api/events/:id
 * @description Get a single event by ID
 * @access Public
 */
router.get("/:id", getEventById);

/**
 * @route POST /api/events/:id/register
 * @description Register for an event
 * @access Private
 */
router.post("/:id/register", verifyJWT, registerForEvent);

// Admin routes
/**
 * @route POST /api/events
 * @description Create a new event
 * @access Admin
 */
router.post("/", verifyJWT, isAdmin, createEvent);

/**
 * @route PUT /api/events/:id
 * @description Update an event
 * @access Admin
 */
router.put("/:id", verifyJWT, isAdmin, updateEvent);

/**
 * @route DELETE /api/events/:id
 * @description Delete an event
 * @access Admin
 */
router.delete("/:id", verifyJWT, isAdmin, deleteEvent);

export default router; 