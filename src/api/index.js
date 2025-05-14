import { app } from '../app.js';

// Export a function that can be used with serverless platforms
export default async function handler(req, res) {
  // Forward the request to the Express app
  return app(req, res);
}
