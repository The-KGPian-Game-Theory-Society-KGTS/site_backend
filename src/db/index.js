import mongoose from "mongoose";

// Track the connection
let cachedConnection = null;

const DBConnect = async () => {
    // If we already have a connection, use it
    if (cachedConnection) {
        console.log("Using cached database connection");
        return cachedConnection;
    }

    try {
        // Set up MongoDB connection options for serverless environment
        const options = {
            // Allow working with MongoDB Atlas
            useNewUrlParser: true,
            useUnifiedTopology: true,
            // Connection pool size configuration for serverless
            maxPoolSize: parseInt(process.env.DB_MAX_POOL_SIZE || "1000"),
            minPoolSize: parseInt(process.env.DB_MIN_POOL_SIZE || "1"),
            serverSelectionTimeoutMS: 10000, // Timeout after 10s
            socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
        };

        // Connect to the database
        const connectionInstance = await mongoose.connect(process.env.MONGODB_URI, options);
        
        // Save the connection for reuse
        cachedConnection = connectionInstance;
        
        console.log(`\n MongoDB connected successfully \n${connectionInstance.connection.host}`);
        return connectionInstance;
    } catch (error) {
        console.log("MongoDB connection error ", error);
        // Don't call process.exit in serverless environment
        throw error;
    }
};

export default DBConnect;