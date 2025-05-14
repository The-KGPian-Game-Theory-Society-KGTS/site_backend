import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { errorHandler } from "./middlewares/error.middleware.js";

// Import routes
import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import eventRoutes from "./routes/event.routes.js";
import blogRoutes from "./routes/blog.routes.js";

const app = express();

// Middlewares
app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
}));

// Body parsing middleware that handles JSON in different content types
app.use((req, res, next) => {
    // Skip if content-type is explicitly set as application/json
    // Let express.json() handle it instead
    if (req.headers['content-type'] && 
        req.headers['content-type'].includes('application/json')) {
        return next();
    }
    
    let data = '';
    
    req.on('data', chunk => {
        data += chunk;
    });
    
    req.on('end', () => {
        if (data) {
            req.rawBody = data;
            
            // Only parse if not already parsed by express.json
            if (!req.body && (data.startsWith('{') || data.startsWith('['))) {
                try {
                    req.body = JSON.parse(data);
                    console.log("Parsed JSON successfully:", req.body);
                } catch (e) {
                    console.error("Failed to parse JSON-like data:", e.message);
                }
            }
        }
        next();
    });
});

// Standard Express parsers as fallbacks
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser());

// Debug route to check request processing
app.use((req, res, next) => {
    console.log(`${req.method} ${req.path} - Content-Type: ${req.headers['content-type']}`);
    console.log('Request body after parsing:', req.body);
    next();
});

// Default route
app.get("/", (req, res) => {
    res.send("API is running");
});

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/blogs", blogRoutes);

// 404 handler for undefined routes
app.use("*", (req, res) => {
    res.status(404).json({
        success: false,
        message: "Route not found"
    });
});

// Global error handler
app.use(errorHandler);

// Export app as default
export default app;
// Also maintain named export for backward compatibility
export { app };