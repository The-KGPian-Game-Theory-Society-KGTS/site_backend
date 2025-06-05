// controllers/user.controller.js
import { User } from "../models/user.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

/**
 * Get user profile
 */
const getUserProfile = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id).select("-password -refreshToken");
    
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
 * Update user profile (Fixed and secure)
 */
const updateUserProfile = asyncHandler(async (req, res) => {
    const { userName, fullName, collegeName, phoneNumber } = req.body;
    
    // Prevent updating protected fields
    const protectedFields = [
        'email', 'password', 'emailVerified',  
        'kgpMail', 'kgpMailVerified', 'isAdmin', 'refreshToken', 'riddlePoints'
    ];
    
    const attemptedProtectedUpdates = Object.keys(req.body).filter(key => 
        protectedFields.includes(key)
    );
    
    if (attemptedProtectedUpdates.length > 0) {
        throw new ApiError(400, 
            `Cannot update protected fields: ${attemptedProtectedUpdates.join(', ')}. Use specific verification endpoints for phone/email updates.`
        );
    }
    
    // Build update object with validation
    const updateData = {};
    
    if (userName !== undefined) {
        const trimmedUsername = userName.trim().toLowerCase();
        
        if (trimmedUsername.length < 3) {
            throw new ApiError(400, "Username must be at least 3 characters long");
        }
        
        if (trimmedUsername.length > 20) {
            throw new ApiError(400, "Username cannot exceed 20 characters");
        }
        
        // Check username uniqueness
        const existingUser = await User.findOne({ 
            userName: trimmedUsername,
            _id: { $ne: req.user._id }
        });
        
        if (existingUser) {
            throw new ApiError(409, "Username is already taken");
        }
        
        updateData.userName = trimmedUsername;
    }
    
    if (fullName !== undefined) {
        const trimmedFullName = fullName.trim();
        
        if (trimmedFullName.length < 2) {
            throw new ApiError(400, "Full name must be at least 2 characters long");
        }
        
        if (trimmedFullName.length > 50) {
            throw new ApiError(400, "Full name cannot exceed 50 characters");
        }
        
        updateData.fullName = trimmedFullName;
    }
    
    if (collegeName !== undefined) {
        const trimmedCollegeName = collegeName.trim();
        
        if (trimmedCollegeName.length > 100) {
            throw new ApiError(400, "College name cannot exceed 100 characters");
        }
        
        updateData.collegeName = trimmedCollegeName;
    }

    updateData.phoneNumber = phoneNumber ? phoneNumber.trim() : undefined;
    
    // Check if there's anything to update
    if (Object.keys(updateData).length === 0) {
        throw new ApiError(400, "No valid fields provided for update");
    }
    
    // Update user
    const updatedUser = await User.findByIdAndUpdate(
        req.user._id,
        { $set: updateData },
        { 
            new: true, 
            runValidators: true 
        }
    ).select("-password -refreshToken");
    
    if (!updatedUser) {
        throw new ApiError(404, "User not found");
    }
    
    return res.status(200).json(
        new ApiResponse(
            200,
            { user: updatedUser },
            "Profile updated successfully"
        )
    );
});

/**
 * Get all users with pagination (Admin only)
 */
const getAllUsers = asyncHandler(async (req, res) => {
    if (!req.user?.isAdmin) {
        throw new ApiError(403, "Access denied. Admins only.");
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // Build filter object
    const filter = {};
    
    // Add search functionality
    if (req.query.search) {
        const searchRegex = new RegExp(req.query.search, 'i');
        filter.$or = [
            { userName: searchRegex },
            { fullName: searchRegex },
            { email: searchRegex },
            { collegeName: searchRegex }
        ];
    }
    
    // Filter by verification status
    if (req.query.emailVerified !== undefined) {
        filter.emailVerified = req.query.emailVerified === 'true';
    }
    
    // if (req.query.phoneVerified !== undefined) {
    //     filter.phoneVerified = req.query.phoneVerified === 'true';
    // }
    
    if (req.query.kgpMailVerified !== undefined) {
        filter.kgpMailVerified = req.query.kgpMailVerified === 'true';
    }

    const [users, total] = await Promise.all([
        User.find(filter)
            .select("-password -refreshToken")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit),
        User.countDocuments(filter)
    ]);

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                users,
                total,
                page,
                totalPages: Math.ceil(total / limit),
                hasNextPage: page < Math.ceil(total / limit),
                hasPrevPage: page > 1
            },
            "Users fetched successfully"
        )
    );
});

export default {
    getUserProfile,
    updateUserProfile,
    getAllUsers
};
