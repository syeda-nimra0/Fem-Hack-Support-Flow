/**
 * Vercel serverless function entry point.
 *
 * Exports the Express app so Vercel can handle all /api/* routes.
 *
 * Note: Socket.IO (WebSocket) is NOT supported on Vercel serverless.
 * The client automatically falls back to polling when Socket.IO is
 * unavailable. See client/src/lib/socket.js for the fallback logic.
 *
 * Environment variables (set in Vercel project settings):
 *   MONGODB_URI  — your MongoDB Atlas connection string (REQUIRED)
 *   JWT_SECRET   — any random string for signing JWT tokens
 *   GEMINI_API_KEY — Google Gemini API key for AI triage
 *   GEMINI_MODEL — gemini-3.6-flash (or other Gemini model)
 *   GEMINI_API_BASE — https://generativelanguage.googleapis.com/v1beta
 */
import app from '../server/src/app.js';

export default app;
