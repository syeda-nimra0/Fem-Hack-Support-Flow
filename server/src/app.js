import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import ticketRoutes from './routes/tickets.js';
import statsRoutes from './routes/stats.js';
import aiRoutes from './routes/ai.js';
import { getConnectionMode } from './db.js';
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
