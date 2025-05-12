import { ApiError } from "../utils/ApiError.js";

/**
 * Error handling middleware
 */
export const errorHandler = (err, req, res, next) => {
    console.error("ERROR: ", err);
    
    // Handle API errors
    if (err instanceof ApiError) {
        return res.status(err.statusCode).json({
            success: false,
            message: err.message,
            errors: err.errors,
            stack: process.env.NODE_ENV === "development" ? err.stack : undefined
        });
    }
    
    // Handle Mongoose validation errors
    if (err.name === "ValidationError") {
        const errors = Object.values(err.errors).map(val => val.message);
        return res.status(400).json({
            success: false,
            message: "Validation Error",
            errors,
            stack: process.env.NODE_ENV === "development" ? err.stack : undefined
        });
    }
    
    // Handle Mongoose duplicate key errors
    if (err.code === 11000) {
        const field = Object.keys(err.keyValue)[0];
        return res.status(409).json({
            success: false,
            message: `Duplicate field value: ${field}`,
            field,
            stack: process.env.NODE_ENV === "development" ? err.stack : undefined
        });
    }
    
    // Default error response
    return res.status(500).json({
        success: false,
        message: "Internal Server Error",
        stack: process.env.NODE_ENV === "development" ? err.stack : undefined
    });
}; 