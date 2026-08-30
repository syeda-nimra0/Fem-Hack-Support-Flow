import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import config from './config.js';
import { createApp } from './app.js';
import { initDatabase, closeDatabase, getConnectionMode } from './db.js';
import { User } from './models.js';
import { initSocket } from './socket.js';
import { seedData } from './seed.js';

/**
 * Standalone entry (local dev / long-running hosts):
 *   · port 3001 — Express REST API
 *   · port 3002 — Socket.IO realtime
 * On Vercel this file is NOT used — api/index.js runs the same app instead.
 */
async function main() {
  await initDatabase();
  const app = createApp();

  const httpServer = http.createServer(app);
  const socketServer = http.createServer();
  const io = new SocketIOServer(socketServer, {
    path: '/',
    cors: { origin: '*', methods: ['GET', 'POST'] },
    pingTimeout: 60000,
    pingInterval: 25000,
  });
  app.set('io', io);
  initSocket(io);

  // First-boot seeding so the demo always has meaningful data
  if ((await User.countDocuments()) === 0) {
    try {
      await seedData();
    } catch (err) {
      console.warn('[boot] Seeding skipped:', err.message);
    }
  }

  httpServer.listen(config.port, '0.0.0.0', () => {
    console.log(`[boot] SupportFlow API listening on port ${config.port}`);
    console.log(`[boot] Database mode: ${getConnectionMode()}`);
  });
  socketServer.listen(config.socketPort, '0.0.0.0', () => {
    console.log(`[boot] Socket.IO realtime listening on port ${config.socketPort}`);
  });

  // Graceful shutdown
  const shutdown = async (signal) => {
    console.log(`[boot] ${signal} received — shutting down...`);
    io.close();
    httpServer.close();
    socketServer.close();
    await closeDatabase();
    process.exit(0);
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  console.error('[boot] Fatal:', err);
  process.exit(1);
});
