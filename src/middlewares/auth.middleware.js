import jwt from "jsonwebtoken";
import { User } from "../models/user.models.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";

/**
 * Verify user is authenticated
 */
const verifyJWT = asyncHandler(async (req, res, next) => {
    try {
        // Get token from cookies or authorization header
        const token = req.cookies?.accessToken || 
            req.header("Authorization")?.replace("Bearer ", "");
        
        if (!token) {
            throw new ApiError(401, "Unauthorized request");
        }
        
        // Verify the token
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        
        // Find the user
        const user = await User.findById(decodedToken?._id)
            .select("-password -refreshToken");
        
        if (!user) {
            throw new ApiError(401, "Invalid access token");
        }
        
        // Add user to request object
        req.user = user;
        
        next();
        
    } catch (error) {
        // More specific error messages based on JWT error types
        if (error.name === "TokenExpiredError") {
            throw new ApiError(401, "Access token has expired");
        } else if (error.name === "JsonWebTokenError") {
            throw new ApiError(401, "Invalid token format");
        } else {
            throw new ApiError(401, error?.message || "Invalid access token");
        }
    }
});

/**
 * Verify user has admin role
 */
const isAdmin = asyncHandler(async (req, res, next) => {
    if (!req.user?.isAdmin) {
        throw new ApiError(403, "Admin access required");
    }
    next();
});

/**
 * Refresh access token using refresh token
 */
const refreshAccessToken = asyncHandler(async (req, res) => {
    try {
        // Get refresh token from cookies or request body
        const incomingRefreshToken = req.cookies?.refreshToken || req.body.refreshToken;
        
        if (!incomingRefreshToken) {
            throw new ApiError(401, "Unauthorized request");
        }
        
        // Verify the refresh token
        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);
        
        // Find the user
        const user = await User.findById(decodedToken?._id);
        
        if (!user) {
            throw new ApiError(401, "Invalid refresh token");
        }
        
        // Check if incoming refresh token matches the stored one
        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "Refresh token is expired or used");
        }
        
        // Generate new tokens
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();
        
        // Update refresh token
        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });
        
        // Set cookies
        const cookieOptions = {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production"
        };
        
        return res
            .status(200)
            .cookie("accessToken", accessToken, cookieOptions)
            .cookie("refreshToken", refreshToken, cookieOptions)
            .json({
                statusCode: 200,
                data: { accessToken, refreshToken },
                message: "Access token refreshed"
            });
        
    } catch (error) {
        // More specific error messages
        if (error.name === "TokenExpiredError") {
            throw new ApiError(401, "Refresh token has expired");
        } else if (error.name === "JsonWebTokenError") {
            throw new ApiError(401, "Invalid token format");
        } else {
            throw new ApiError(401, error?.message || "Invalid refresh token");
        }
    }
});

// Default export for all middleware functions
export default {
    verifyJWT,
    isAdmin,
    refreshAccessToken
};

// Also export individually for backward compatibility
export {
    verifyJWT,
    isAdmin,
    refreshAccessToken
};