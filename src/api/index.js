import app from '../app.js';
import DBConnect from '../db/index.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Create database connection promise
let dbConnectionPromise = null;

// Export a function that can be used with serverless platforms
export default async function handler(req, res) {
  try {
    // Connect to database if not already connected
    if (!dbConnectionPromise) {
      console.log('Establishing new DB connection...');
      dbConnectionPromise = DBConnect();
    }
    
    // Wait for database connection
    await dbConnectionPromise;
    
    // Forward the request to the Express app
    return app(req, res);
  } catch (error) {
    console.error('Serverless handler error:', error);
    
    // Reset connection promise if there was an error
    dbConnectionPromise = null;
    
    // Return error response
    return res.status(500).json({
      success: false,
      message: 'Database connection error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
}
