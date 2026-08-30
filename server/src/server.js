/**
 * Local development server entry point.
 *
 * Imports the Express app from app.js, connects to MongoDB, seeds demo
 * data, initializes Socket.IO, and starts listening.
 *
 * For Vercel deployment, use api/index.js instead (which exports the
 * app directly without listening).
 */
import http from 'http';
import { config } from './config/index.js';
import { connectDB } from './config/db.js';
import { initSocket } from './socket/index.js';
import { seedDemoData } from './utils/seed.js';
import app from './app.js';

async function start() {
  // Connect to MongoDB
  await connectDB();

  // Seed demo data on first run
  try {
    await seedDemoData();
  } catch (err) {
    console.warn('[server] Seed failed (continuing):', err.message);
  }

  // Create HTTP server and initialize Socket.IO
  const httpServer = http.createServer(app);
  initSocket(httpServer);

  // Start listening
  httpServer.listen(config.port, () => {
    console.log('');
    console.log('  ┌─────────────────────────────────────────────────────────────┐');
    console.log('  │  SupportFlow server running                                │');
    console.log(`  │  URL:      http://localhost:${config.port.toString().padEnd(28)}│`);
    console.log(`  │  Env:      ${config.nodeEnv.padEnd(43)}│`);
    console.log(`  │  Client:   ${config.clientUrl.padEnd(43)}│`);
    console.log(`  │  AI:       ${(config.gemini.apiKey ? `Gemini (${config.gemini.model})` : 'rule-based').padEnd(43)}│`);
    console.log('  │  Socket:   Enabled (real-time)                             │');
    console.log('  └─────────────────────────────────────────────────────────────┘');
    console.log('');
    console.log('  Demo credentials:');
    console.log('    Customer:  customer@supportflow.demo / password123');
    console.log('    Agent:     agent@supportflow.demo / password123');
    console.log('    Admin:     admin@supportflow.demo / password123');
    console.log('');
  });

  // Graceful shutdown
  const shutdown = () => {
    console.log('\n  Shutting down server…');
    httpServer.close(() => process.exit(0));
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
