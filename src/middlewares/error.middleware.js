// middlewares/error.middleware.js
import { ApiError } from "../utils/ApiError.js";

/**
 * Enhanced error handling middleware with security features
 */
export const errorHandler = (err, req, res, next) => {
    // Enhanced logging with more context
    const timestamp = new Date().toISOString();
    const clientIP = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent') || 'Unknown';
    
    console.error(`[${timestamp}] ERROR: `, {
        message: err.message,
        statusCode: err.statusCode || err.status || 500,
        path: req.path,
        method: req.method,
        ip: clientIP,
        userAgent: userAgent.substring(0, 100), // Limit user agent length
        userId: req.user?._id || 'Anonymous',
        stack: process.env.NODE_ENV === "development" ? err.stack : 'Hidden in production'
    });
    
    // Handle API errors (your existing logic)
    if (err instanceof ApiError) {
        return res.status(err.statusCode).json({
            success: false,
            message: err.message,
            errors: err.errors,
            timestamp,
            path: req.path,
            stack: process.env.NODE_ENV === "development" ? err.stack : undefined
        });
    }
    
    // Handle rate limiting errors (new)
    if (err.status === 429 || err.statusCode === 429) {
        return res.status(429).json({
            success: false,
            message: err.message || "Too many requests, please try again later",
            retryAfter: err.retryAfter || Math.ceil((err.windowMs || 900000) / 1000),
            timestamp,
            path: req.path,
            stack: process.env.NODE_ENV === "development" ? err.stack : undefined
        });
    }
    
    // Handle request timeout errors (new)
    if (err.code === 'TIMEOUT' || err.message === 'Request timeout') {
        return res.status(408).json({
            success: false,
            message: "Request timeout - please try again",
            timestamp,
            path: req.path,
            stack: process.env.NODE_ENV === "development" ? err.stack : undefined
        });
    }
    
    // Handle payload too large errors (new)
    if (err.type === 'entity.too.large' || err.status === 413) {
        return res.status(413).json({
            success: false,
            message: "Request entity too large",
            maxSize: "1MB",
            timestamp,
            path: req.path,
            stack: process.env.NODE_ENV === "development" ? err.stack : undefined
        });
    }
    
    // Handle JSON parsing errors (enhanced)
    if (err.type === 'entity.parse.failed' || err.name === 'SyntaxError') {
        return res.status(400).json({
            success: false,
            message: "Invalid JSON format",
            timestamp,
            path: req.path,
            stack: process.env.NODE_ENV === "development" ? err.stack : undefined
        });
    }
    
    // Handle CORS errors (new)
    if (err.message && err.message.includes('CORS')) {
        return res.status(403).json({
            success: false,
            message: "CORS policy violation",
            timestamp,
            path: req.path,
            stack: process.env.NODE_ENV === "development" ? err.stack : undefined
        });
    }
    
    // Handle Mongoose validation errors (your existing logic, enhanced)
    if (err.name === "ValidationError") {
        const errors = Object.values(err.errors).map(val => ({
            field: val.path,
            message: val.message,
            value: val.value
        }));
        
        return res.status(400).json({
            success: false,
            message: "Validation Error",
            errors,
            timestamp,
            path: req.path,
            stack: process.env.NODE_ENV === "development" ? err.stack : undefined
        });
    }
    
    // Handle Mongoose duplicate key errors (your existing logic, enhanced)
    if (err.code === 11000) {
        const field = Object.keys(err.keyValue)[0];
        const value = err.keyValue[field];
        
        return res.status(409).json({
            success: false,
            message: `Duplicate field value: ${field}`,
            field,
            value: typeof value === 'string' ? value.substring(0, 50) : value, // Limit value length
            timestamp,
            path: req.path,
            stack: process.env.NODE_ENV === "development" ? err.stack : undefined
        });
    }
    
    // Handle Mongoose cast errors (new)
    if (err.name === "CastError") {
        return res.status(400).json({
            success: false,
            message: `Invalid ${err.path}: ${err.value}`,
            field: err.path,
            timestamp,
            path: req.path,
            stack: process.env.NODE_ENV === "development" ? err.stack : undefined
        });
    }
    
    // Handle JWT errors (new)
    if (err.name === "JsonWebTokenError") {
        return res.status(401).json({
            success: false,
            message: "Invalid token",
            timestamp,
            path: req.path,
            stack: process.env.NODE_ENV === "development" ? err.stack : undefined
        });
    }
    
    if (err.name === "TokenExpiredError") {
        return res.status(401).json({
            success: false,
            message: "Token expired",
            timestamp,
            path: req.path,
            stack: process.env.NODE_ENV === "development" ? err.stack : undefined
        });
    }
    
    // Handle MongoDB connection errors (new)
    if (err.name === "MongoError" || err.name === "MongooseError") {
        // Don't expose internal database errors in production
        const message = process.env.NODE_ENV === "development" 
            ? err.message 
            : "Database connection error";
            
        return res.status(503).json({
            success: false,
            message,
            timestamp,
            path: req.path,
            stack: process.env.NODE_ENV === "development" ? err.stack : undefined
        });
    }
    
    // Log unexpected errors for monitoring (new)
    if (!err.statusCode && !err.status) {
        console.error(`[${timestamp}] UNEXPECTED ERROR:`, {
            message: err.message,
            name: err.name,
            code: err.code,
            path: req.path,
            method: req.method,
            ip: clientIP,
            stack: err.stack
        });
    }
    
    // Default error response (your existing logic, enhanced)
    const statusCode = err.statusCode || err.status || 500;
    const message = statusCode === 500 
        ? "Internal Server Error" 
        : err.message || "Something went wrong";
    
    return res.status(statusCode).json({
        success: false,
        message,
        timestamp,
        path: req.path,
        ...(statusCode >= 500 && { errorId: `ERR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` }),
        stack: process.env.NODE_ENV === "development" ? err.stack : undefined
    });
};

/**
 * 404 Not Found handler - call this before errorHandler
 */
export const notFoundHandler = (req, res, next) => {
    const error = new ApiError(404, `Route ${req.originalUrl} not found`);
    next(error);
};

/**
 * Async error wrapper to catch async/await errors
 */
export const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
