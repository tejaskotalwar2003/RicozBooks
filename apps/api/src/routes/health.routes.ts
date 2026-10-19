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

  return res.status(200).json({
    status: 'online',
    app: config.appName,
    version: config.appVersion,
    database: dbStatus,
  });
});

export default router;

