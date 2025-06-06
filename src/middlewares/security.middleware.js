// middlewares/security.middleware.js
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import hpp from 'hpp';

// Rate limiting configurations
export const createRateLimit = (windowMs, max, message, skipSuccessfulRequests = true) => {
    return rateLimit({
        windowMs,
        max,
        message: {
            success: false,
            message,
            retryAfter: Math.ceil(windowMs / 1000)
        },
        standardHeaders: true,
        legacyHeaders: false,
        skipSuccessfulRequests,
        skip: (req) => {
            // Skip rate limiting for admin users (optional)
            return req.user?.isAdmin === true;
        }
    });
};

// Global rate limiter - 100 requests per 15 minutes
export const globalLimiter = createRateLimit(
    15 * 60 * 1000, // 15 minutes
    100, // limit each IP to 100 requests per windowMs
    'Too many requests from this IP, please try again later.'
);

// Auth rate limiter - stricter for authentication endpoints
export const authLimiter = createRateLimit(
    15 * 60 * 1000, // 15 minutes
    5, // limit each IP to 5 requests per windowMs
    'Too many authentication attempts, please try again later.',
    false // don't skip successful requests for auth
);

// OTP rate limiter - very strict for OTP endpoints
export const otpLimiter = createRateLimit(
    5 * 60 * 1000, // 5 minutes
    3, // limit each IP to 3 OTP requests per 5 minutes
    'Too many OTP requests, please try again later.',
    false
);

// Password reset limiter
export const passwordResetLimiter = createRateLimit(
    60 * 60 * 1000, // 1 hour
    3, // limit each IP to 3 password reset attempts per hour
    'Too many password reset attempts, please try again later.',
    false
);

// Speed limiter - gradually slow down repeated requests
export const speedLimiter = slowDown({
    windowMs: 15 * 60 * 1000, // 15 minutes
    delayAfter: 50, // allow 50 requests per windowMs at full speed
    delayMs: 500, // add 500ms of delay per request after delayAfter
    maxDelayMs: 20000, // maximum delay of 20 seconds
});

// Helmet configuration for security headers
export const helmetConfig = helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
        },
    },
    crossOriginEmbedderPolicy: false, // Disable if you need to embed resources
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    }
});

// Request timeout middleware
export const requestTimeout = (timeout = 30000) => {
    return (req, res, next) => {
        req.setTimeout(timeout, () => {
            const err = new Error('Request timeout');
            err.status = 408;
            next(err);
        });
        next();
    };
};

// Request size validator
export const validateRequestSize = (req, res, next) => {
    const contentLength = parseInt(req.headers['content-length'] || '0');
    const maxSize = 1024 * 1024; // 1MB
    
    if (contentLength > maxSize) {
        return res.status(413).json({
            success: false,
            message: 'Request entity too large'
        });
    }
    next();
};

// IP whitelist/blacklist middleware
export const ipFilter = (req, res, next) => {
    const clientIP = req.ip || req.connection.remoteAddress;
    
    // Blacklisted IPs (add suspicious IPs here)
    const blacklistedIPs = [];
    
    // Whitelisted IPs (add trusted IPs here)
    const whitelistedIPs = [];
    
    if (blacklistedIPs.includes(clientIP)) {
        return res.status(403).json({
            success: false,
            message: 'Access denied'
        });
    }
    
    // If whitelist is not empty and IP is not whitelisted
    if (whitelistedIPs.length > 0 && !whitelistedIPs.includes(clientIP)) {
        return res.status(403).json({
            success: false,
            message: 'Access denied'
        });
    }
    
    next();
};

// MongoDB injection prevention
export const mongoSanitizer = mongoSanitize({
    replaceWith: '_',
    onSanitize: ({ req, key }) => {
        console.warn(`Sanitized key ${key} in request to ${req.path}`);
    }
});

// HTTP Parameter Pollution protection
export const hppProtection = hpp({
    whitelist: ['tags', 'categories'] // Allow arrays for these parameters
});
