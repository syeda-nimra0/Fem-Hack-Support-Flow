import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import config from './config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, '..', '.data');

let memoryServer = null;
let connectionMode = 'unknown';

/** True when running as a serverless function (Vercel) — no embedded DB, no binaries. */
const isServerless = Boolean(process.env.VERCEL || process.env.SERVERLESS);

export function getConnectionMode() {
  return connectionMode;
}

async function connectWithMongoose(uri, label) {
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 12000 });
  connectionMode = label;
  const host = mongoose.connection.host || '';
  console.log(`[db] Connected to MongoDB (${label})${host ? ` @ ${host}` : ''}`);
}

/**
 * Database bootstrap strategy:
 *  1. If MONGODB_URI is configured (e.g. a MongoDB Atlas connection string),
 *     connect to it directly.
 *  2. Otherwise (or if that connection fails) start an embedded, persistent
 *     local MongoDB instance via mongodb-memory-server so the application is
 *     always demonstrable. Data is persisted under .data/mongodb.
 *     (Serverless — Vercel — skips this fallback: binaries cannot run there.)
 */
export async function initDatabase() {
  if (config.mongodbUri) {
    try {
      await connectWithMongoose(config.mongodbUri, 'mongodb-uri');
      return;
    } catch (err) {
      console.warn(`[db] Could not connect to MONGODB_URI (${err.message}).`);
      if (isServerless) {
        // No embedded fallback in serverless — surface a clear error.
        throw new Error(
          'Cannot reach MongoDB Atlas. Check MONGODB_URI and the Atlas Network Access list (0.0.0.0/0 for demos).'
        );
      }
      console.warn('[db] Falling back to embedded MongoDB.');
    }
  } else if (isServerless) {
    throw new Error('MONGODB_URI is required when running on Vercel (set it in Project Settings → Environment Variables).');
  }

  try {
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    const dbPath = path.join(DATA_DIR, 'mongodb');
    await fs.mkdir(dbPath, { recursive: true });
    memoryServer = await MongoMemoryServer.create({
      instance: {
        port: 27071,
        dbName: config.mongodbDbName,
        dbPath,
        storageEngine: 'wiredTiger',
      },
    });
    await connectWithMongoose(memoryServer.getUri(config.mongodbDbName), 'embedded (local fallback)');
  } catch (err) {
    console.error('[db] Failed to start embedded MongoDB:', err.message);
    throw err;
  }
}

export async function closeDatabase() {
  await mongoose.disconnect().catch(() => {});
  if (memoryServer) {
    await memoryServer.stop().catch(() => {});
  }
}
