import mongoose from 'mongoose';
import { config } from '../config/index.js';

/**
 * Connect to MongoDB Atlas.
 *
 * You MUST set MONGODB_URI in server/.env. Example:
 *   mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/supportflow?retryWrites=true&w=majority
 *
 * Create a free cluster at https://www.mongodb.com/atlas if you don't have one.
 */
export async function connectDB() {
  if (!config.mongoUri) {
    console.error('');
    console.error('  ┌─────────────────────────────────────────────────────────────┐');
    console.error('  │  ERROR: MONGODB_URI is not set                            │');
    console.error('  │                                                           │');
    console.error('  │  Please set MONGODB_URI in server/.env                    │');
    console.error('  │  Create a free cluster at https://www.mongodb.com/atlas   │');
    console.error('  │                                                           │');
    console.error('  │  Example:                                                 │');
    console.error('  │  MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/db │');
    console.error('  └─────────────────────────────────────────────────────────────┘');
    console.error('');
    process.exit(1);
  }

  console.log('[db] Connecting to MongoDB...');

  mongoose.set('strictQuery', true);

  try {
    await mongoose.connect(config.mongoUri, {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
    });
    console.log('[db] Connected to MongoDB successfully');
  } catch (err) {
    console.error('');
    console.error('  ┌─────────────────────────────────────────────────────────────┐');
    console.error('  │  ERROR: Could not connect to MongoDB                       │');
    console.error('  │                                                           │');
    console.error(`  │  ${err.message.slice(0, 57).padEnd(57)}│`);
    console.error('  │                                                           │');
    console.error('  │  Check your MONGODB_URI and network connection.           │');
    console.error('  │  Make sure your IP is whitelisted in Atlas.               │');
    console.error('  └─────────────────────────────────────────────────────────────┘');
    console.error('');
    process.exit(1);
  }

  mongoose.connection.on('error', (err) => {
    console.error('[db] MongoDB error:', err.message);
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('[db] MongoDB disconnected');
  });

  return mongoose.connection;
}

export async function disconnectDB() {
  await mongoose.disconnect();
  console.log('[db] MongoDB disconnected');
}

export async function getDbStatus() {
  const status = mongoose.connection.readyState;
  const labels = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  return {
    readyState: status,
    label: labels[status] || 'unknown',
    host: mongoose.connection.host || null,
    name: mongoose.connection.name || null,
  };
}
