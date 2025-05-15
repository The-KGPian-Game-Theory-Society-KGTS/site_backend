import { User } from "../models/user.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

/**
 * Get user profile
 */
const getUserProfile = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    
    const user = await User.findById(userId).select("-password -refreshToken");
    
    if (!user) {
        throw new ApiError(404, "User not found");
    }
    
    return res.status(200).json(
        new ApiResponse(
            200,
            { user },
            "User profile fetched successfully"
        )
    );
});

/**
 * Update user profile
 * Note: Email, fullName, and password cannot be updated
 */
const updateUserProfile = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { phoneNumber, collegeName, rollNumber, kgpMail } = req.body;
    
    // Check if user is trying to update protected fields
    if (req.body.email || req.body.fullName || req.body.password) {
        throw new ApiError(400, "Email, fullName, and password cannot be updated");
    }
    
    // Build update object with only allowed fields
    const updateData = {};
    if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber;
    if (collegeName !== undefined) updateData.collegeName = collegeName;
    if (rollNumber !== undefined) updateData.rollNumber = rollNumber;
    if (kgpMail !== undefined) updateData.kgpMail = kgpMail;
    
    // Update user
    const updatedUser = await User.findByIdAndUpdate(
        userId,
        updateData,
        { new: true, runValidators: true }
    ).select("-password -refreshToken");
    
    if (!updatedUser) {
        throw new ApiError(404, "User not found");
    }
    
    return res.status(200).json(
        new ApiResponse(
            200,
            { user: updatedUser },
            "User profile updated successfully"
        )
    );
});

/**
 * Get all users with pagination (Admin only)
 */
const getAllUsers = asyncHandler(async (req, res) => {
    // Check if the user is an admin
    if (!req.user?.isAdmin) {
        throw new ApiError(403, "Access denied. Admins only.");
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
        User.find()
            .select("-password -refreshToken")
            .skip(skip)
            .limit(limit),
        User.countDocuments()
    ]);

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                users,
                total,
                page,
                totalPages: Math.ceil(total / limit)
            },
            "Users fetched successfully"
        )
    );
});


// Default export for all functions
export default {
    getUserProfile,
    updateUserProfile,
    getAllUsers
};
