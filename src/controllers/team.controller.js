import { Team } from "../models/team.models.js";
import { Event } from "../models/event.models.js";
import { User } from "../models/user.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import mongoose from "mongoose";

/**
 * Create a new team for an event
 */
const createTeam = asyncHandler(async (req, res) => {
  const { eventId, teamName } = req.body;
  const userId = req.user._id;

  if (!eventId || !teamName) {
    throw new ApiError(400, "Event ID and team name are required");
  }

  // Check if event exists and allows team registration
  const event = await Event.findById(eventId);
  if (!event) {
    throw new ApiError(404, "Event not found");
  }

  if (!event.teamRegistration) {
    throw new ApiError(400, "Team registration is not allowed for this event");
  }

  if (!event.registration) {
    throw new ApiError(400, "Registration is not open for this event");
  }

  if (event.status === "Past") {
    throw new ApiError(400, "Cannot register for past events");
  }

  // Check if user is already registered (solo or team)
  const isUserInSolo = event.registeredUsers.includes(userId);
  if (isUserInSolo) {
    throw new ApiError(400, "User is already registered for this event as solo participant");
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

  // Check team limits
  if (event.maxTeams && event.teams.length >= event.maxTeams) {
    throw new ApiError(400, "Maximum number of teams reached for this event");
  }

  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    // Create team
    const team = await Team.create([{
      teamName,
      teamLeader: userId,
      event: eventId,
      teamMembers: []
    }], { session });

    // Add team to event
    await Event.findByIdAndUpdate(
      eventId,
      { $push: { teams: team[0]._id } },
      { session }
    );

    // Add event to user's registered events
    await User.findByIdAndUpdate(
      userId,
      { $push: { registeredEvents: eventId } },
      { session }
    );

    await session.commitTransaction();

    const populatedTeam = await Team.findById(team[0]._id)
      .populate('teamLeader', 'fullName userName email')
      .populate('teamMembers', 'fullName userName email');

    return res.status(201).json(
      new ApiResponse(201, { team: populatedTeam }, "Team created successfully")
    );
  } catch (error) {
    await session.abortTransaction();
    if (error.code === 11000) {
      throw new ApiError(409, "Team name already exists for this event");
    }
    throw new ApiError(500, "Failed to create team");
  } finally {
    session.endSession();
  }
});

/**
 * Join an existing team
 */
const joinTeam = asyncHandler(async (req, res) => {
  const { teamId } = req.params;
  const userId = req.user._id;

  const team = await Team.findById(teamId).populate('event');
  if (!team) {
    throw new ApiError(404, "Team not found");
  }

  const event = team.event;

  // Check if registration is open
  if (!event.registration) {
    throw new ApiError(400, "Registration is not open for this event");
  }

  if (event.status === "Past") {
    throw new ApiError(400, "Cannot join team for past events");
  }

  // Check if user is already registered
  const isUserInSolo = event.registeredUsers.includes(userId);
  if (isUserInSolo) {
    throw new ApiError(400, "User is already registered for this event as solo participant");
  }

  if (team.teamLeader.equals(userId) || team.teamMembers.includes(userId)) {
    throw new ApiError(400, "User is already part of this team");
  }

  // Check if user is in another team for this event
  const existingTeam = await Team.findOne({
    event: event._id,
    _id: { $ne: teamId },
    $or: [
      { teamLeader: userId },
      { teamMembers: userId }
    ]
  });

  if (existingTeam) {
    throw new ApiError(400, "User is already part of another team for this event");
  }

  // Check team size limits
  if (team.isFull(event.maxTeamSize)) {
    throw new ApiError(400, "Team is already full");
  }

  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    // Add user to team
    team.addMember(userId);
    await team.save({ session });

    // Add event to user's registered events
    await User.findByIdAndUpdate(
      userId,
      { $addToSet: { registeredEvents: event._id } },
      { session }
    );

    await session.commitTransaction();

    const updatedTeam = await Team.findById(teamId)
      .populate('teamLeader', 'fullName userName email')
      .populate('teamMembers', 'fullName userName email');

    return res.status(200).json(
      new ApiResponse(200, { team: updatedTeam }, "Joined team successfully")
    );
  } catch (error) {
    await session.abortTransaction();
    throw new ApiError(500, "Failed to join team");
  } finally {
    session.endSession();
  }
});

/**
 * Leave a team
 */
const leaveTeam = asyncHandler(async (req, res) => {
  const { teamId } = req.params;
  const userId = req.user._id;

  const team = await Team.findById(teamId).populate('event');
  if (!team) {
    throw new ApiError(404, "Team not found");
  }

  const event = team.event;

  // Check if user is part of the team
  const isLeader = team.teamLeader.equals(userId);
  const isMember = team.teamMembers.some(member => member.equals(userId));

  if (!isLeader && !isMember) {
    throw new ApiError(400, "User is not part of this team");
  }

  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    if (isLeader) {
      // If leader is leaving, delete the entire team
      await Event.findByIdAndUpdate(
        event._id,
        { $pull: { teams: teamId } },
        { session }
      );

      // Remove event from all team members' registered events
      const allMembers = [team.teamLeader, ...team.teamMembers];
      await User.updateMany(
        { _id: { $in: allMembers } },
        { $pull: { registeredEvents: event._id } },
        { session }
      );

      await Team.findByIdAndDelete(teamId, { session });
    } else {
      // Remove member from team
      team.removeMember(userId);
      await team.save({ session });

      // Remove event from user's registered events
      await User.findByIdAndUpdate(
        userId,
        { $pull: { registeredEvents: event._id } },
        { session }
      );
    }

    await session.commitTransaction();

    return res.status(200).json(
      new ApiResponse(200, {}, isLeader ? "Team disbanded successfully" : "Left team successfully")
    );
  } catch (error) {
    await session.abortTransaction();
    throw new ApiError(500, "Failed to leave team");
  } finally {
    session.endSession();
  }
});

/**
 * Get teams for an event (with privacy controls)
 */
const getEventTeams = asyncHandler(async (req, res) => {
  const { eventId } = req.params;
  const { showDetails = false } = req.query;
  const userId = req.user?._id;

  const event = await Event.findById(eventId);
  if (!event) {
    throw new ApiError(404, "Event not found");
  }

  let populateFields = 'teamName currentSize';
  
  // Show detailed info only if user is admin or part of the event
  if (showDetails === 'true' && userId) {
    const isAdmin = req.user?.isAdmin;
    const isParticipant = event.registeredUsers.includes(userId);
    const userTeam = await Team.findOne({
      event: eventId,
      $or: [{ teamLeader: userId }, { teamMembers: userId }]
    });

    if (isAdmin || isParticipant || userTeam) {
      populateFields = {
        path: 'teamLeader teamMembers',
        select: 'fullName userName'
      };
    }
  }

  const teams = await Team.find({ event: eventId })
    .populate(populateFields)
    .select('teamName teamLeader teamMembers currentSize createdAt');

  return res.status(200).json(
    new ApiResponse(200, { teams }, "Event teams fetched successfully")
  );
});

/**
 * Get user's teams
 */
const getUserTeams = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const teams = await Team.find({
    $or: [
      { teamLeader: userId },
      { teamMembers: userId }
    ]
  })
  .populate('event', 'title date time location status')
  .populate('teamLeader', 'fullName userName')
  .populate('teamMembers', 'fullName userName')
  .sort({ createdAt: -1 });

  return res.status(200).json(
    new ApiResponse(200, { teams }, "User teams fetched successfully")
  );
});

export default {
  createTeam,
  joinTeam,
  leaveTeam,
  getEventTeams,
  getUserTeams
};
