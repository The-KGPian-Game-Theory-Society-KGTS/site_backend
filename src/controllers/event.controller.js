import { Event } from "../models/event.models.js";
import { User } from "../models/user.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import mongoose from "mongoose";

/**
 * Create a new event (Admin only)
 */
export const createEvent = asyncHandler(async (req, res) => {
    const { title, description, date, time, location, registration, status, image } = req.body;
    
    // Validate required fields
    if (!title || !date || !time || !location || !status || !image) {
        throw new ApiError(400, "All fields are required");
    }
    
    // Check if event with same title already exists
    const existingEvent = await Event.findOne({ title });
    if (existingEvent) {
        throw new ApiError(409, "Event with this title already exists");
    }
    
    // Create event
    const event = await Event.create({
        title,
        description,
        date,
        time,
        location,
        registration: registration || false,
        status,
        image
    });
    
    return res.status(201).json(
        new ApiResponse(
            201,
            { event },
            "Event created successfully"
        )
    );
});

/**
 * Update an existing event (Admin only)
 */
export const updateEvent = asyncHandler(async (req, res) => {
    const eventId = req.params.id;
    const { title, description, date, time, location, registration, status, image } = req.body;
    
    // Validate event ID
    if (!eventId) {
        throw new ApiError(400, "Event ID is required");
    }
    
    // Check if event exists
    const event = await Event.findById(eventId);
    if (!event) {
        throw new ApiError(404, "Event not found");
    }
    
    // Check if updating to a title that already exists (but not the same event)
    if (title && title !== event.title) {
        const eventWithTitle = await Event.findOne({ title });
        if (eventWithTitle) {
            throw new ApiError(409, "Event with this title already exists");
        }
    }
    
    // Update event
    const updatedEvent = await Event.findByIdAndUpdate(
        eventId,
        {
            title: title || event.title,
            description: description || event.description,
            date: date || event.date,
            time: time || event.time,
            location: location || event.location,
            registration: registration !== undefined ? registration : event.registration,
            status: status || event.status,
            image: image || event.image
        },
        { new: true, runValidators: true }
    );
    
    return res.status(200).json(
        new ApiResponse(
            200,
            { event: updatedEvent },
            "Event updated successfully"
        )
    );
});

/**
 * Delete an event (Admin only)
 */
export const deleteEvent = asyncHandler(async (req, res) => {
    const eventId = req.params.id;
    
    // Validate event ID
    if (!eventId) {
        throw new ApiError(400, "Event ID is required");
    }
    
    // Check if event exists and delete
    const event = await Event.findByIdAndDelete(eventId);
    
    if (!event) {
        throw new ApiError(404, "Event not found");
    }
    
    return res.status(200).json(
        new ApiResponse(
            200,
            {},
            "Event deleted successfully"
        )
    );
});

/**
 * Get all events with optional filters
 */
export const getAllEvents = asyncHandler(async (req, res) => {
    const { status } = req.query;
    
    // Build query
    const query = {};
    if (status) {
        query.status = status;
    }
    
    // Get events
    const events = await Event.find(query).sort({ createdAt: -1 });
    
    return res.status(200).json(
        new ApiResponse(
            200,
            { events },
            "Events fetched successfully"
        )
    );
});

/**
 * Get a single event by ID
 */
export const getEventById = asyncHandler(async (req, res) => {
    const eventId = req.params.id;
    
    // Validate event ID
    if (!eventId) {
        throw new ApiError(400, "Event ID is required");
    }
    
    // Get event
    const event = await Event.findById(eventId);
    
    if (!event) {
        throw new ApiError(404, "Event not found");
    }
    
    return res.status(200).json(
        new ApiResponse(
            200,
            { event },
            "Event fetched successfully"
        )
    );
});

/**
 * Register for an event (Authentication required)
 */
export const registerForEvent = asyncHandler(async (req, res) => {
    const eventId = req.params.id;
    const userId = req.user._id;
    
    // Validate event ID
    if (!eventId) {
        throw new ApiError(400, "Event ID is required");
    }
    
    // Check if event exists and registration is open
    const event = await Event.findById(eventId);
    
    if (!event) {
        throw new ApiError(404, "Event not found");
    }
    
    if (!event.registration) {
        throw new ApiError(400, "Registration is not open for this event");
    }
    
    if (event.status === "Past") {
        throw new ApiError(400, "Cannot register for past events");
    }
    
    // Check if user is already registered
    const isUserRegistered = event.registeredUsers.includes(userId);
    
    if (isUserRegistered) {
        throw new ApiError(400, "User is already registered for this event");
    }
    
    // Add user to event's registered users and event to user's registered events
    const session = await mongoose.startSession();
    
    try {
        session.startTransaction();
        
        // Update event
        await Event.findByIdAndUpdate(
            eventId,
            { $push: { registeredUsers: userId } },
            { session }
        );
        
        // Update user
        await User.findByIdAndUpdate(
            userId,
            { $push: { registeredEvents: eventId } },
            { session }
        );
        
        await session.commitTransaction();
    } catch (error) {
        await session.abortTransaction();
        throw new ApiError(500, "Failed to register for event");
    } finally {
        session.endSession();
    }
    
    return res.status(200).json(
        new ApiResponse(
            200,
            {},
            "Registered for event successfully"
        )
    );
});

/**
 * Get user's registered events (Authentication required)
 */
export const getUserRegisteredEvents = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    
    // Get user with populated events
    const user = await User.findById(userId).populate("registeredEvents");
    
    if (!user) {
        throw new ApiError(404, "User not found");
    }
    
    return res.status(200).json(
        new ApiResponse(
            200,
            { events: user.registeredEvents },
            "User registered events fetched successfully"
        )
    );
}); 