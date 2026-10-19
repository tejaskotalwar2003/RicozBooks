import mongoose from 'mongoose';
import { app } from './app';
import { config } from './config';

async function startServer() {
  try {
    console.log(`Connecting to MongoDB at: ${config.mongoUri.replace(/:([^:@]+)@/, ':****@')}...`);
    await mongoose.connect(config.mongoUri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log('[OK] Connected to MongoDB.');
  } catch (err) {
    console.warn(`[WARN] MongoDB connection notice: ${err}. Starting server in offline DB mode...`);
  }

  const server = app.listen(config.port, () => {
    console.log(`🚀 RicozBooks Express API server listening on port ${config.port} (${config.env})`);
  });

  const shutdown = async () => {
    console.log('Shutting down server gracefully...');
    server.close(async () => {
      await mongoose.disconnect();
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

if (process.env.NODE_ENV !== 'test') {
  startServer();
}

