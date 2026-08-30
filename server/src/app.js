import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import ticketRoutes from './routes/tickets.js';
import statsRoutes from './routes/stats.js';
import aiRoutes from './routes/ai.js';
import { getConnectionMode, initDatabase } from './db.js';
import { seedData } from './seed.js';
import { User } from './models.js';
import config from './config.js';

/**
 * Express application factory — shared by:
 *   · src/index.js      (standalone Node server: REST + Socket.IO + embedded DB fallback)
 *   · api/index.js      (Vercel serverless function: REST only)
 *
 * Keeps the app free of `listen()` and database boot so it can be mounted in
 * any runtime. `onRequest` runs once per incoming request BEFORE the routes
 * (used by the serverless entry to guarantee DB readiness).
 */
export function createApp({ onRequest } = {}) {
  const app = express();
  app.set('io', null); // wired by the standalone server once Socket.IO exists

  app.use(cors());
  app.use(express.json({ limit: '1mb' }));

  if (onRequest) {
    app.use(async (req, _res, next) => {
      try {
        await onRequest(req);
      } catch (err) {
        return next(err);
      }
      next();
    });
  }

  app.use((req, _res, next) => {
    if (req.path.startsWith('/api')) console.log(`[api] ${req.method} ${req.originalUrl.split('?')[0]}`);
    next();
  });

  // Friendly root route — opening the deployment URL in a browser immediately
  // shows that the API is alive (all real endpoints live under /api/*).
  app.get('/', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'supportflow-api',
      endpoints: {
        health: '/api/health',
        auth: '/api/auth',
        tickets: '/api/tickets',
        stats: '/api/stats',
        ai: '/api/ai',
      },
    });
  });

  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'supportflow-api',
      database: getConnectionMode(),
      autoAssign: config.autoAssign,
      time: new Date().toISOString(),
    });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/tickets', ticketRoutes);
  app.use('/api/stats', statsRoutes);
  app.use('/api/ai', aiRoutes);

  app.use((_req, res) => res.status(404).json({ error: 'Not found.' }));
  app.use((err, _req, res, _next) => {
    const status = err.status || 500;
    if (status >= 500) console.error('[api] Unhandled error:', err);
    res.status(status).json({
      error: err.message || 'Internal server error.',
      ...(err.fields ? { fields: err.fields } : {}),
    });
  });

  return app;
}

// ---------------------------------------------------------------------------
// Default export — serverless safety net.
//
// Vercel's zero-config detection sometimes picks `src/app.js` (a conventional
// Express filename) as THE serverless entry instead of api/index.js. Without
// a default export that crashes with:
//   "Invalid export found in module … The default export must be a function
//    or server."
// Exporting a fully-bootstrapped app here makes that detection path work too:
// lazy DB init + first-boot seeding run on the first request — exactly like
// api/index.js does. The standalone server (src/index.js) is unaffected; it
// imports { createApp } and builds its own instance.
// ---------------------------------------------------------------------------
let bootPromise = null;
function ensureDatabaseReady() {
  if (!bootPromise) {
    bootPromise = (async () => {
      await initDatabase();
      if ((await User.countDocuments()) === 0) {
        try {
          await seedData();
          console.log('[boot] Empty database — demo data seeded.');
        } catch (err) {
          console.warn('[boot] Seeding skipped:', err.message);
        }
      }
    })().catch((err) => {
      bootPromise = null; // allow the next request to retry initialization
      throw err;
    });
  }
  return bootPromise;
}

export default createApp({ onRequest: ensureDatabaseReady });
