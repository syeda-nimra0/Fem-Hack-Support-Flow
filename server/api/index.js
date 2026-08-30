import { createApp } from '../src/app.js';
import { initDatabase } from '../src/db.js';
import { seedData } from '../src/seed.js';
import { User } from '../src/models.js';

/**
 * Vercel serverless entry — the whole Express API as ONE function.
 *
 * vercel.json rewrites every /api/* request here. Vercel's Node runtime
 * passes the ORIGINAL request path through (e.g. /api/auth/login), so the
 * Express router matches routes exactly like in local development.
 *
 * Notes:
 *  · Socket.IO is not available in serverless — the client automatically
 *    falls back to polling (set VITE_SOCKET_URL="" when deploying).
 *  · MongoDB Atlas connects per warm lambda instance; Mongoose caches the
 *    connection so repeated invocations reuse it.
 *  · Demo data is seeded lazily on the first request when the database is
 *    still empty (seedData is idempotent — safe under concurrent cold starts).
 */

// One-time bootstrap per lambda instance (cached promise; retried on failure).
let ready = null;
function ensureReady() {
  if (!ready) {
    ready = (async () => {
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
      ready = null; // allow the next request to retry initialization
      throw err;
    });
  }
  return ready;
}

const app = createApp({ onRequest: ensureReady });

export default async function handler(req, res) {
  return app(req, res);
}
