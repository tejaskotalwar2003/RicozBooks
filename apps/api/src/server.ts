import mongoose from 'mongoose';
import { app } from './app';
import { config } from './config';
import { SeedService } from './services/seed.service';

async function startServer() {
  const isProd = config.env === 'production';
  const maskedUri = config.mongoUri.replace(/:([^:@]+)@/, ':****@');

  // Mongoose connection event listeners for production observability & reconnection
  mongoose.connection.on('connected', () => {
    console.log('[DB OK] Mongoose connected to MongoDB Atlas.');
  });
  mongoose.connection.on('error', (err) => {
    console.error('[DB ERROR] Mongoose connection error:', err);
  });
  mongoose.connection.on('disconnected', () => {
    console.warn('[DB WARN] Mongoose disconnected from MongoDB Atlas.');
  });
  mongoose.connection.on('reconnected', () => {
    console.log('[DB OK] Mongoose reconnected to MongoDB Atlas.');
  });

  try {
    console.log(`[DB] Connecting to MongoDB Atlas at: ${maskedUri}...`);
    await mongoose.connect(config.mongoUri, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
      heartbeatFrequencyMS: 10000,
      maxPoolSize: 25,
      minPoolSize: 2,
      retryWrites: true,
      w: 'majority',
    });
    console.log('[DB OK] Connected to MongoDB Atlas successfully.');

    // Automatically verify & bootstrap initial departments, roles, workspace, and super admin
    try {
      await SeedService.seedAll();
    } catch (seedErr) {
      console.warn('[WARN] Automatic seed notice:', seedErr);
    }
  } catch (err) {
    if (isProd) {
      console.error(`[FATAL] Failed to connect to MongoDB Atlas at startup: ${err}. Terminating process.`);
      process.exit(1);
    } else {
      mongoose.set('bufferCommands', false);
      console.warn(`[WARN] MongoDB connection notice: ${err}. Starting server in offline DB mode for local development...`);
    }
  }

  const server = app.listen(config.port, () => {
    console.log(`🚀 RicozBooks Express API server listening on 0.0.0.0:${config.port} (${config.env})`);
  });

  const shutdown = async () => {
    console.log('Shutting down server gracefully...');
    server.close(async () => {
      try {
        await mongoose.disconnect();
        console.log('[DB] Disconnected from MongoDB Atlas.');
      } catch (dErr) {
        console.error('[DB ERROR] Error during MongoDB disconnect:', dErr);
      }
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

if (process.env.NODE_ENV !== 'test') {
  startServer();
}
