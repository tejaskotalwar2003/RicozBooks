import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { config } from '../config';

const router = Router();

router.get('/health', async (_req: Request, res: Response) => {
  const dbState = mongoose.connection.readyState;
  let dbStatus = 'disconnected';
  if (dbState === 1) dbStatus = 'healthy';
  else if (dbState === 2) dbStatus = 'connecting';
  else if (dbState === 3) dbStatus = 'disconnecting';
  else dbStatus = 'unhealthy / disconnected';

  const isHealthy = dbState === 1;
  const isProd = config.env === 'production';
  const statusCode = (isProd && !isHealthy) ? 503 : 200;

  return res.status(statusCode).json({
    status: isHealthy ? 'online' : (isProd ? 'degraded' : 'online'),
    app: config.appName,
    version: config.appVersion,
    database: dbStatus,
  });
});

export default router;
