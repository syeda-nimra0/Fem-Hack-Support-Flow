import 'dotenv/config';
import crypto from 'crypto';

const config = {
  port: Number(process.env.PORT || 3001),
  socketPort: Number(process.env.SOCKET_PORT || 3002),
  jwtSecret: process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  ...(process.env.VERCEL && !process.env.JWT_SECRET
    ? console.warn(
        '[boot] WARNING: JWT_SECRET is not set. On Vercel each instance generates a different secret and sessions break. Set JWT_SECRET in Project Settings → Environment Variables.'
      )
    : {}),
  // Gemini AI (server-side only — NEVER exposed to the frontend)
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  geminiModels: (process.env.GEMINI_MODELS || 'gemini-3.6-flash,gemini-flash-latest,gemini-2.0-flash')
    .split(',')
    .map((m) => m.trim())
    .filter(Boolean),
  geminiTimeoutMs: Number(process.env.GEMINI_TIMEOUT_MS || 15000),
  // MongoDB — set MONGODB_URI to your MongoDB Atlas connection string, e.g.
  //   mongodb+srv://<user>:<password>@<cluster>.mongodb.net/supportflow?retryWrites=true&w=majority
  // When empty or unreachable, the server falls back to an embedded local MongoDB
  // (mongodb-memory-server) with persistent storage so the demo always runs.
  mongodbUri: process.env.MONGODB_URI || '',
  mongodbDbName: process.env.MONGODB_DB_NAME || 'supportflow',
  // Optional bonus features
  autoAssign: String(process.env.AUTO_ASSIGN || 'false') === 'true',
  aiChatRateLimit: Number(process.env.AI_CHAT_RATE_LIMIT || 20), // requests per minute
};

export const CATEGORIES = ['Billing', 'Technical', 'Account', 'Shipping', 'Product', 'General'];
export const PRIORITIES = ['Low', 'Medium', 'High'];
export const STATUSES = ['new', 'assigned', 'in_progress', 'resolved'];
export const STATUS_LABELS = {
  new: 'New',
  assigned: 'Assigned',
  in_progress: 'In Progress',
  resolved: 'Resolved',
};

export default config;
