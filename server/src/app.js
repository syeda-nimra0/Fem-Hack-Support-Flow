/**
 * Express app setup — shared between local dev (server.js) and
 * Vercel serverless deployment (api/index.js).
 *
 * This file does NOT call app.listen(). It only configures the app
 * and exports it. The DB connection is handled lazily via middleware
 * so it works in serverless environments.
 */
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';

import { config, isProduction } from './config/index.js';
import { connectDB } from './config/db.js';
import authRoutes from './routes/auth.js';
import ticketRoutes from './routes/tickets.js';
import { notFound, errorHandler } from './middleware/error.js';
import { seedDemoData } from './utils/seed.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// --- Lazy DB connection (cached globally for serverless) ---
let dbConnected = false;
let dbConnectionPromise = null;

async function ensureDbConnected() {
  if (dbConnected) return;
  if (!dbConnectionPromise) {
    dbConnectionPromise = connectDB()
      .then(() => {
        dbConnected = true;
      })
      .catch((err) => {
        dbConnectionPromise = null; // Allow retry on next request
        throw err;
      });
  }
  return dbConnectionPromise;
}

// --- Lazy seeding (only on first request if DB is empty) ---
let seeded = false;
async function ensureSeeded() {
  if (seeded) return;
  try {
    const { User } = await import('./models/User.js');
    const count = await User.countDocuments();
    if (count === 0) {
      console.log('[app] First run detected — seeding demo data…');
      await seedDemoData();
    }
    seeded = true;
  } catch (err) {
    console.warn('[app] Seed check failed (continuing):', err.message);
    seeded = true; // Don't keep retrying
  }
}

// --- Middleware: ensure DB connected before API requests ---
app.use(async (req, res, next) => {
  if (req.path.startsWith('/api/')) {
    try {
      await ensureDbConnected();
      await ensureSeeded();
    } catch (err) {
      return res.status(500).json({
        message: 'Database connection failed. Please check MONGODB_URI.',
        error: isProduction ? undefined : err.message,
      });
    }
  }
  next();
});

// --- Security & utilities ---
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));

app.use(cors({
  origin(origin, cb) {
    // Allow all origins (Vercel preview deployments, localhost, etc.)
    cb(null, true);
  },
  credentials: true,
}));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(morgan(isProduction ? 'combined' : 'dev'));

// --- Rate limiters ---
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: { message: 'Too many auth attempts, please try again later.' },
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  message: { message: 'Too many requests, please slow down.' },
});

// --- Health check ---
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'SupportFlow API',
    version: '1.0.0',
    time: new Date().toISOString(),
    environment: config.nodeEnv,
    ai: config.gemini.apiKey ? `Gemini (${config.gemini.model})` : 'rule-based',
  });
});

// --- Routes ---
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/tickets', apiLimiter, ticketRoutes);

// 404 for unknown API routes
app.use('/api', notFound);

// --- Serve built client (only in non-Vercel production / dev) ---
// In Vercel, static files are served by the CDN, so we skip this.
if (!process.env.VERCEL) {
  const clientBuildPath = path.resolve(__dirname, '../../client/dist');
  app.use(express.static(clientBuildPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/') || req.path.startsWith('/socket.io/')) {
      return next();
    }
    res.sendFile(path.join(clientBuildPath, 'index.html'), (err) => {
      if (err) {
        res.status(200).json({
          message: 'SupportFlow API server is running. Build the client to see the UI.',
        });
      }
    });
  });
}

app.use(errorHandler);

export default app;
