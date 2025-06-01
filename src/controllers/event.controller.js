import { Event } from "../models/event.models.js";
import { User } from "../models/user.models.js";
import { Team } from "../models/team.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import mongoose from "mongoose";

/**
 * Create a new event (Admin only)
 */
const createEvent = asyncHandler(async (req, res) => {
  const { 
    title, description, date, time, location, registration, status, image,
    teamRegistration, minTeamSize, maxTeamSize, maxParticipants, maxTeams, link
  } = req.body;

  // Validate required fields
  if (!title || !date || !time || !location || !status || !image) {
    throw new ApiError(400, "All required fields must be provided");
  }

  // Validate team registration fields
  if (teamRegistration) {
    if (!minTeamSize || !maxTeamSize) {
      throw new ApiError(400, "Team size limits are required for team registration");
    }
    if (minTeamSize > maxTeamSize) {
      throw new ApiError(400, "Minimum team size cannot be greater than maximum team size");
    }
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
    image,
    link,
    teamRegistration: teamRegistration || false,
    minTeamSize: minTeamSize || 1,
    maxTeamSize: maxTeamSize || 1,
    maxParticipants,
    maxTeams
  });

  return res.status(201).json(
    new ApiResponse(201, { event }, "Event created successfully")
  );
});

/**
 * Update an existing event (Admin only)
 */
const updateEvent = asyncHandler(async (req, res) => {
  const eventId = req.params.id;
  const updateData = req.body;

  if (!eventId) {
    throw new ApiError(400, "Event ID is required");
  }

  const event = await Event.findById(eventId);
  if (!event) {
    throw new ApiError(404, "Event not found");
  }

  // Check if updating to a title that already exists
  if (updateData.title && updateData.title !== event.title) {
    const eventWithTitle = await Event.findOne({ title: updateData.title });
    if (eventWithTitle) {
      throw new ApiError(409, "Event with this title already exists");
    }
  }

  // Validate team registration updates
  if (updateData.teamRegistration && (updateData.minTeamSize || updateData.maxTeamSize)) {
    const minSize = updateData.minTeamSize || event.minTeamSize;
    const maxSize = updateData.maxTeamSize || event.maxTeamSize;
    
    if (minSize > maxSize) {
      throw new ApiError(400, "Minimum team size cannot be greater than maximum team size");
    }
  }

  const updatedEvent = await Event.findByIdAndUpdate(
    eventId,
    updateData,
    { new: true, runValidators: true }
  );

  return res.status(200).json(
    new ApiResponse(200, { event: updatedEvent }, "Event updated successfully")
  );
});

/**
 * Delete an event (Admin only)
 */
const deleteEvent = asyncHandler(async (req, res) => {
  const eventId = req.params.id;

  if (!eventId) {
    throw new ApiError(400, "Event ID is required");
  }

  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    // Delete all teams for this event
    await Team.deleteMany({ event: eventId }, { session });

    // Remove event from all users' registered events
    await User.updateMany(
      { registeredEvents: eventId },
      { $pull: { registeredEvents: eventId } },
      { session }
    );

    // Delete the event
    const event = await Event.findByIdAndDelete(eventId, { session });
    if (!event) {
      throw new ApiError(404, "Event not found");
    }

    await session.commitTransaction();

    return res.status(200).json(
      new ApiResponse(200, {}, "Event deleted successfully")
    );
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
});

/**
 * Get all events with optional filters (Public - limited info)
 */
const getAllEvents = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const query = {};
  
  if (status) {
    query.status = status;
  }

  // Public route - hide sensitive information
  const events = await Event.find(query)
    .select('-registeredUsers -teams')
    .sort({ createdAt: -1 });

  // Add participant counts without exposing actual participants
  const eventsWithCounts = await Promise.all(
    events.map(async (event) => {
      const soloCount = await Event.findById(event._id).select('registeredUsers').then(e => e.registeredUsers.length);
      const teams = await Team.find({ event: event._id }).select('teamMembers');
      const teamParticipants = teams.reduce((acc, team) => acc + team.teamMembers.length + 1, 0);
      
      return {
        ...event.toObject(),
        participantCount: soloCount + teamParticipants,
        teamCount: teams.length
      };
    })
  );

  return res.status(200).json(
    new ApiResponse(200, { events: eventsWithCounts }, "Events fetched successfully")
  );
});

/**
 * Get a single event by ID (Public - limited info)
 */
const getEventById = asyncHandler(async (req, res) => {
  const eventId = req.params.id;

  if (!eventId) {
    throw new ApiError(400, "Event ID is required");
  }

  // Public route - hide sensitive information
  const event = await Event.findById(eventId).select('-registeredUsers -teams');
  if (!event) {
    throw new ApiError(404, "Event not found");
  }

  // Add counts without exposing actual participants
  const soloCount = await Event.findById(eventId).select('registeredUsers').then(e => e.registeredUsers.length);
  const teams = await Team.find({ event: eventId }).select('teamMembers');
  const teamParticipants = teams.reduce((acc, team) => acc + team.teamMembers.length + 1, 0);

  const eventWithCounts = {
    ...event.toObject(),
    participantCount: soloCount + teamParticipants,
    teamCount: teams.length
  };

  return res.status(200).json(
    new ApiResponse(200, { event: eventWithCounts }, "Event fetched successfully")
  );
});

/**
 * Register for an event as solo participant (Authentication required)
 */
const registerForEvent = asyncHandler(async (req, res) => {
  const eventId = req.params.id;
  const userId = req.user._id;

  if (!eventId) {
    throw new ApiError(400, "Event ID is required");
  }

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

  // Check if event allows solo registration
  if (event.teamRegistration && !event.registeredUsers.length && event.minTeamSize > 1) {
    throw new ApiError(400, "This event requires team registration");
  }

  // Check if user is already registered (solo or team)
  const isUserRegistered = event.registeredUsers.includes(userId);
  if (isUserRegistered) {
    throw new ApiError(400, "User is already registered for this event");
  }

  const existingTeam = await Team.findOne({
    event: eventId,
    $or: [
      { teamLeader: userId },
      { teamMembers: userId }
    ]
  });

  if (existingTeam) {
    throw new ApiError(400, "User is already part of a team for this event");
  }

  // Check participant limits
  if (event.maxParticipants) {
    const currentCount = event.registeredUsers.length;
    const teamCount = await Team.find({ event: eventId }).then(teams => 
      teams.reduce((acc, team) => acc + team.teamMembers.length + 1, 0)
    );
    
    if (currentCount + teamCount >= event.maxParticipants) {
      throw new ApiError(400, "Maximum number of participants reached");
    }
  }

  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    await Event.findByIdAndUpdate(
      eventId,
      { $push: { registeredUsers: userId } },
      { session }
    );

    await User.findByIdAndUpdate(
      userId,
      { $push: { registeredEvents: eventId } },
      { session }
    );

    await session.commitTransaction();

    return res.status(200).json(
      new ApiResponse(200, {}, "Registered for event successfully")
    );
  } catch (error) {
    await session.abortTransaction();
    throw new ApiError(500, "Failed to register for event");
  } finally {
    session.endSession();
  }
});

/**
 * Unregister from an event (Authentication required)
 */
const unregisterFromEvent = asyncHandler(async (req, res) => {
  const eventId = req.params.id;
  const userId = req.user._id;

  if (!eventId) {
    throw new ApiError(400, "Event ID is required");
  }

  const event = await Event.findById(eventId);
  if (!event) {
    throw new ApiError(404, "Event not found");
  }

  if (event.status === "Past") {
    throw new ApiError(400, "Cannot unregister from past events");
  }

  // Check if user is registered as solo participant
  const isUserRegistered = event.registeredUsers.includes(userId);
  if (!isUserRegistered) {
    throw new ApiError(400, "User is not registered for this event as solo participant");
  }

  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    await Event.findByIdAndUpdate(
      eventId,
      { $pull: { registeredUsers: userId } },
      { session }
    );

    await User.findByIdAndUpdate(
      userId,
      { $pull: { registeredEvents: eventId } },
      { session }
    );

    await session.commitTransaction();

    return res.status(200).json(
      new ApiResponse(200, {}, "Unregistered from event successfully")
    );
  } catch (error) {
    await session.abortTransaction();
    throw new ApiError(500, "Failed to unregister from event");
  } finally {
    session.endSession();
  }
});

/**
 * Get user's registered events (Authentication required)
 */
const getUserRegisteredEvents = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const user = await User.findById(userId).populate({
    path: 'registeredEvents',
    select: '-registeredUsers -teams' // Hide sensitive data
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // Get user's teams
  const userTeams = await Team.find({
    $or: [
      { teamLeader: userId },
      { teamMembers: userId }
    ]
  }).populate({
    path: 'event',
    select: '-registeredUsers -teams'
  });

  return res.status(200).json(
    new ApiResponse(
      200, 
      { 
        soloEvents: user.registeredEvents,
        teamEvents: userTeams
      }, 
      "User registered events fetched successfully"
    )
  );
});

/**
 * Get event participants (Admin only)
 */
const getEventParticipants = asyncHandler(async (req, res) => {
  const eventId = req.params.id;

  if (!req.user?.isAdmin) {
    throw new ApiError(403, "Admin access required");
  }

  if (!eventId) {
    throw new ApiError(400, "Event ID is required");
  }

  const event = await Event.findById(eventId)
    .populate('registeredUsers', 'fullName userName email phoneNumber collegeName')
    .populate({
      path: 'teams',
      populate: {
        path: 'teamLeader teamMembers',
        select: 'fullName userName email phoneNumber collegeName'
      }
    });

  if (!event) {
    throw new ApiError(404, "Event not found");
  }

  return res.status(200).json(
    new ApiResponse(
      200, 
      { 
        soloParticipants: event.registeredUsers,
        teams: event.teams
      }, 
      "Event participants fetched successfully"
    )
  );
});

export default {
  createEvent,
  updateEvent,
  deleteEvent,
  getAllEvents,
  getEventById,
  registerForEvent,
  unregisterFromEvent,
  getUserRegisteredEvents,
  getEventParticipants
};
