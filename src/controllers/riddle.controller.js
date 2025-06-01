import { Riddle } from "../models/riddle.models.js";
import { RiddleResponse } from "../models/riddleResponse.models.js";
import { User } from "../models/user.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import mongoose from "mongoose";

/**
 * Create a new riddle (Admin only)
 */
const createRiddle = asyncHandler(async (req, res) => {
  const { title, description, image, openingTime, closingTime } = req.body;

  if (!title || !description || !image || !openingTime || !closingTime) {
    throw new ApiError(400, "All fields are required");
  }

  // Validate dates
  const opening = new Date(openingTime);
  const closing = new Date(closingTime);
  const now = new Date();

  if (opening >= closing) {
    throw new ApiError(400, "Opening time must be before closing time");
  }

  if (closing <= now) {
    throw new ApiError(400, "Closing time must be in the future");
  }

  const riddle = await Riddle.create({
    title,
    description,
    image,
    openingTime: opening,
    closingTime: closing
  });

  return res.status(201).json(
    new ApiResponse(201, { riddle }, "Riddle created successfully")
  );
});

/**
 * Update a riddle (Admin only)
 */
const updateRiddle = asyncHandler(async (req, res) => {
  const { riddleId } = req.params;
  const updateData = req.body;

  if (!riddleId) {
    throw new ApiError(400, "Riddle ID is required");
  }

  const riddle = await Riddle.findById(riddleId);
  if (!riddle) {
    throw new ApiError(404, "Riddle not found");
  }

  // Validate dates if being updated
  if (updateData.openingTime || updateData.closingTime) {
    const opening = new Date(updateData.openingTime || riddle.openingTime);
    const closing = new Date(updateData.closingTime || riddle.closingTime);

    if (opening >= closing) {
      throw new ApiError(400, "Opening time must be before closing time");
    }
  }

  const updatedRiddle = await Riddle.findByIdAndUpdate(
    riddleId,
    updateData,
    { new: true, runValidators: true }
  );

  return res.status(200).json(
    new ApiResponse(200, { riddle: updatedRiddle }, "Riddle updated successfully")
  );
});

/**
 * Delete a riddle (Admin only)
 */
const deleteRiddle = asyncHandler(async (req, res) => {
  const { riddleId } = req.params;

  if (!riddleId) {
    throw new ApiError(400, "Riddle ID is required");
  }

  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    // Delete all responses for this riddle
    await RiddleResponse.deleteMany({ riddle: riddleId }, { session });

    // Delete the riddle
    const riddle = await Riddle.findByIdAndDelete(riddleId, { session });
    if (!riddle) {
      throw new ApiError(404, "Riddle not found");
    }

    await session.commitTransaction();

    return res.status(200).json(
      new ApiResponse(200, {}, "Riddle deleted successfully")
    );
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
});

/**
 * Get all riddles (Public - limited info)
 */
const getAllRiddles = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const now = new Date();
  
  let query = {};
  
  if (status === 'active') {
    query = {
      isActive: true,
      openingTime: { $lte: now },
      closingTime: { $gte: now }
    };
  } else if (status === 'upcoming') {
    query = {
      isActive: true,
      openingTime: { $gt: now }
    };
  } else if (status === 'closed') {
    query = {
      $or: [
        { closingTime: { $lt: now } },
        { isActive: false }
      ]
    };
  }

  const riddles = await Riddle.find(query)
    .select('title description image openingTime closingTime isActive totalResponses')
    .sort({ createdAt: -1 });

  // Add status information
  const riddlesWithStatus = riddles.map(riddle => ({
    ...riddle.toObject(),
    isOpen: riddle.isOpen,
    isClosed: riddle.isClosed
  }));

  return res.status(200).json(
    new ApiResponse(200, { riddles: riddlesWithStatus }, "Riddles fetched successfully")
  );
});

/**
 * Get single riddle by ID (Public - limited info)
 */
const getRiddleById = asyncHandler(async (req, res) => {
  const { riddleId } = req.params;

  if (!riddleId) {
    throw new ApiError(400, "Riddle ID is required");
  }

  const riddle = await Riddle.findById(riddleId)
    .select('title description image openingTime closingTime isActive totalResponses');

  if (!riddle) {
    throw new ApiError(404, "Riddle not found");
  }

  const riddleWithStatus = {
    ...riddle.toObject(),
    isOpen: riddle.isOpen,
    isClosed: riddle.isClosed
  };

  return res.status(200).json(
    new ApiResponse(200, { riddle: riddleWithStatus }, "Riddle fetched successfully")
  );
});

/**
 * Submit response to a riddle (Authentication required)
 */
const submitResponse = asyncHandler(async (req, res) => {
  const { riddleId } = req.params;
  const { response } = req.body;
  const userId = req.user._id;

  if (!riddleId || !response) {
    throw new ApiError(400, "Riddle ID and response are required");
  }

  const riddle = await Riddle.findById(riddleId);
  if (!riddle) {
    throw new ApiError(404, "Riddle not found");
  }

  // Check if riddle is open
  if (!riddle.isOpen) {
    if (riddle.isClosed) {
      throw new ApiError(400, "Riddle submission period has ended");
    } else {
      throw new ApiError(400, "Riddle is not yet open for submissions");
    }
  }

  // Check if user already submitted a response
  const existingResponse = await RiddleResponse.findOne({
    riddle: riddleId,
    user: userId
  });

  if (existingResponse) {
    throw new ApiError(400, "You have already submitted a response for this riddle");
  }

  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    // Create response
    const riddleResponse = await RiddleResponse.create([{
      riddle: riddleId,
      user: userId,
      response: response.trim()
    }], { session });

    // Update riddle total responses count
    await Riddle.findByIdAndUpdate(
      riddleId,
      { $inc: { totalResponses: 1 } },
      { session }
    );

    await session.commitTransaction();

    return res.status(201).json(
      new ApiResponse(201, { response: riddleResponse[0] }, "Response submitted successfully")
    );
  } catch (error) {
    await session.abortTransaction();
    if (error.code === 11000) {
      throw new ApiError(400, "You have already submitted a response for this riddle");
    }
    throw new ApiError(500, "Failed to submit response");
  } finally {
    session.endSession();
  }
});

/**
 * Get user's submitted responses (Authentication required)
 */
const getUserResponses = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const responses = await RiddleResponse.find({ user: userId })
    .populate('riddle', 'title description image openingTime closingTime')
    .select('response points isCorrect submittedAt')
    .sort({ submittedAt: -1 });

  return res.status(200).json(
    new ApiResponse(200, { responses }, "User responses fetched successfully")
  );
});

/**
 * Get riddle leaderboard (Public - only if admin enabled)
 */
const getRiddleLeaderboard = asyncHandler(async (req, res) => {
  const { riddleId } = req.params;

  if (!riddleId) {
    throw new ApiError(400, "Riddle ID is required");
  }

  const riddle = await Riddle.findById(riddleId);
  if (!riddle) {
    throw new ApiError(404, "Riddle not found");
  }

  // Check if leaderboard is enabled by admin
  if (!riddle.showLeaderboard) {
    throw new ApiError(403, "Leaderboard is not yet available for this riddle");
  }

  const leaderboard = await RiddleResponse.find({ riddle: riddleId })
    .populate('user', 'fullName userName')
    .select('points isCorrect submittedAt user')
    .sort({ points: -1, submittedAt: 1 });

  return res.status(200).json(
    new ApiResponse(200, { riddle: { title: riddle.title }, leaderboard }, "Riddle leaderboard fetched successfully")
  );
});

/**
 * Get total leaderboard (Public - always visible)
 */
const getTotalLeaderboard = asyncHandler(async (req, res) => {
  const { limit = 50 } = req.query;

  // Aggregate total points for each user
  const leaderboard = await User.aggregate([
    {
      $lookup: {
        from: 'riddleresponses',
        localField: '_id',
        foreignField: 'user',
        as: 'responses'
      }
    },
    {
      $addFields: {
        totalPoints: { $sum: '$responses.points' },
        totalSolved: {
          $size: {
            $filter: {
              input: '$responses',
              cond: { $eq: ['$$this.isCorrect', true] }
            }
          }
        },
        totalAttempted: { $size: '$responses' }
      }
    },
    {
      $match: {
        totalAttempted: { $gt: 0 } // Only users who have attempted riddles
      }
    },
    {
      $sort: { totalPoints: -1, totalSolved: -1, fullName: 1 }
    },
    {
      $limit: parseInt(limit)
    },
    {
      $project: {
        fullName: 1,
        userName: 1,
        totalPoints: 1,
        totalSolved: 1,
        totalAttempted: 1
      }
    }
  ]);

  return res.status(200).json(
    new ApiResponse(200, { leaderboard }, "Total leaderboard fetched successfully")
  );
});

/**
 * Get all responses for a riddle (Admin only)
 */
const getRiddleResponses = asyncHandler(async (req, res) => {
  const { riddleId } = req.params;

  if (!riddleId) {
    throw new ApiError(400, "Riddle ID is required");
  }

  const riddle = await Riddle.findById(riddleId);
  if (!riddle) {
    throw new ApiError(404, "Riddle not found");
  }

  const responses = await RiddleResponse.find({ riddle: riddleId })
    .populate('user', 'fullName userName email')
    .sort({ submittedAt: 1 });

  return res.status(200).json(
    new ApiResponse(200, { riddle: { title: riddle.title }, responses }, "Riddle responses fetched successfully")
  );
});

/**
 * Update response scoring (Admin only)
 */
const updateResponseScoring = asyncHandler(async (req, res) => {
  const { responseId } = req.params;
  const { points, isCorrect } = req.body;

  if (!responseId) {
    throw new ApiError(400, "Response ID is required");
  }

  if (points === undefined || isCorrect === undefined) {
    throw new ApiError(400, "Points and isCorrect status are required");
  }

  const response = await RiddleResponse.findById(responseId).populate('user');
  if (!response) {
    throw new ApiError(404, "Response not found");
  }

  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    // Calculate point difference
    const pointDifference = points - response.points;

    // Update response
    await RiddleResponse.findByIdAndUpdate(
      responseId,
      { points, isCorrect },
      { session }
    );

    // Update user's total riddle points
    await User.findByIdAndUpdate(
      response.user._id,
      { $inc: { riddlePoints: pointDifference } },
      { session }
    );

    await session.commitTransaction();

    return res.status(200).json(
      new ApiResponse(200, {}, "Response scoring updated successfully")
    );
  } catch (error) {
    await session.abortTransaction();
    throw new ApiError(500, "Failed to update response scoring");
  } finally {
    session.endSession();
  }
});

/**
 * Bulk update response scoring (Admin only)
 */
const bulkUpdateScoring = asyncHandler(async (req, res) => {
  const { riddleId } = req.params;
  const { updates } = req.body; // Array of { responseId, points, isCorrect }

  if (!riddleId || !updates || !Array.isArray(updates)) {
    throw new ApiError(400, "Riddle ID and updates array are required");
  }

  const riddle = await Riddle.findById(riddleId);
  if (!riddle) {
    throw new ApiError(404, "Riddle not found");
  }

  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    for (const update of updates) {
      const { responseId, points, isCorrect } = update;
      
      if (!responseId || points === undefined || isCorrect === undefined) {
        continue; // Skip invalid updates
      }

      const response = await RiddleResponse.findById(responseId);
      if (!response) {
        continue; // Skip non-existent responses
      }

      // Calculate point difference
      const pointDifference = points - response.points;

      // Update response
      await RiddleResponse.findByIdAndUpdate(
        responseId,
        { points, isCorrect },
        { session }
      );

      // Update user's total riddle points
      await User.findByIdAndUpdate(
        response.user,
        { $inc: { riddlePoints: pointDifference } },
        { session }
      );
    }

    await session.commitTransaction();

    return res.status(200).json(
      new ApiResponse(200, {}, "Bulk scoring updated successfully")
    );
  } catch (error) {
    await session.abortTransaction();
    throw new ApiError(500, "Failed to update bulk scoring");
  } finally {
    session.endSession();
  }
});

/**
 * Toggle riddle leaderboard visibility (Admin only)
 */
const toggleLeaderboardVisibility = asyncHandler(async (req, res) => {
  const { riddleId } = req.params;
  const { showLeaderboard } = req.body;

  if (!riddleId) {
    throw new ApiError(400, "Riddle ID is required");
  }

  if (showLeaderboard === undefined) {
    throw new ApiError(400, "showLeaderboard status is required");
  }

  const riddle = await Riddle.findByIdAndUpdate(
    riddleId,
    { showLeaderboard },
    { new: true }
  );

  if (!riddle) {
    throw new ApiError(404, "Riddle not found");
  }

  return res.status(200).json(
    new ApiResponse(200, { riddle }, `Leaderboard ${showLeaderboard ? 'enabled' : 'disabled'} successfully`)
  );
});

export default {
  createRiddle,
  updateRiddle,
  deleteRiddle,
  getAllRiddles,
  getRiddleById,
  submitResponse,
  getUserResponses,
  getRiddleLeaderboard,
  getTotalLeaderboard,
  getRiddleResponses,
  updateResponseScoring,
  bulkUpdateScoring,
  toggleLeaderboardVisibility
};
