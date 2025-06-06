// app.js
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import compression from "compression";
import { errorHandler } from "./middlewares/error.middleware.js";

// Security imports
import {
    globalLimiter,
    speedLimiter,
    helmetConfig,
    requestTimeout,
    validateRequestSize,
    ipFilter,
    mongoSanitizer,
    hppProtection
} from "./middlewares/security.middleware.js";

// Import routes
import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import eventRoutes from "./routes/event.routes.js";
import blogRoutes from "./routes/blog.routes.js";
import riddleRoutes from './routes/riddle.routes.js';

const app = express();

// Trust proxy - important for rate limiting behind reverse proxy
app.set('trust proxy', 1);

// Security headers
app.use(helmetConfig);

// Request timeout
app.use(requestTimeout(30000)); // 30 seconds timeout

// Request size validation
app.use(validateRequestSize);

// IP filtering
app.use(ipFilter);

// Compression for better performance
app.use(compression({
    level: 6,
    threshold: 1024, // Only compress responses larger than 1KB
    filter: (req, res) => {
        // Don't compress if the request includes a cache-control header with no-transform
        if (req.headers['cache-control'] && req.headers['cache-control'].includes('no-transform')) {
            return false;
        }
        return compression.filter(req, res);
    }
}));

// CORS configuration
const allowedOrigins = process.env.CORS_ORIGIN?.split(',').map(origin => origin.trim());

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (mobile apps, postman, etc.)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            const msg = `The CORS policy for this site does not allow access from the specified Origin: ${origin}`;
            callback(new Error(msg), false);
        }
    },
    credentials: true,
    optionsSuccessStatus: 200, // Some legacy browsers choke on 204
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Rate limiting
app.use(globalLimiter);
app.use(speedLimiter);

// Body parsing with strict limits
app.use(express.json({ 
    limit: "1mb",
    strict: true,
    verify: (req, res, buf) => {
        // Store raw body for signature verification if needed
        req.rawBody = buf;
    }
}));

app.use(express.urlencoded({ 
    extended: true, 
    limit: "1mb",
    parameterLimit: 100 // Limit number of parameters
}));

// MongoDB injection prevention
app.use(mongoSanitizer);

// HTTP Parameter Pollution protection
app.use(hppProtection);

app.use(express.static("public", {
    maxAge: '1d', // Cache static files for 1 day
    etag: false
}));

app.use(cookieParser());

// Custom body parsing middleware for legacy support
app.use((req, res, next) => {
    // Skip if content-type is explicitly set as application/json
    if (req.headers['content-type'] && 
        req.headers['content-type'].includes('application/json')) {
        return next();
    }
    
    let data = '';
    
    req.on('data', chunk => {
        data += chunk;
        
        // Prevent extremely large requests
        if (data.length > 1048576) { // 1MB
            res.status(413).json({
                success: false,
                message: 'Request entity too large'
            });
            return;
        }
    });
    
    req.on('end', () => {
        if (data) {
            req.rawBody = data;
            
            // Only parse if not already parsed by express.json
            if (!req.body && (data.startsWith('{') || data.startsWith('['))) {
                try {
                    req.body = JSON.parse(data);
                    console.log("Parsed JSON successfully:", Object.keys(req.body));
                } catch (e) {
                    console.error("Failed to parse JSON-like data:", e.message);
                    return res.status(400).json({
                        success: false,
                        message: 'Invalid JSON format'
                    });
                }
            }
        }
        next();
    });
});

// Request logging middleware (only in development)
if (process.env.NODE_ENV === 'development') {
    app.use((req, res, next) => {
        console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - IP: ${req.ip}`);
        next();
    });
}

// Health check endpoint
app.get("/health", (req, res) => {
    res.status(200).json({
        success: true,
        message: "API is healthy",
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Default route
app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "KGTS API is running",
        version: "1.0.0",
        documentation: "/api/docs"
    });
});

// API routes with specific rate limiting
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/events", eventRoutes);
app.use('/api/riddles', riddleRoutes);
app.use("/api/blogs", blogRoutes);

// 404 handler for undefined routes
app.use("*", (req, res) => {
    res.status(404).json({
        success: false,
        message: `Route ${req.originalUrl} not found`,
        timestamp: new Date().toISOString()
    });
});

// Global error handler
app.use(errorHandler);

export default app;
export { app };
