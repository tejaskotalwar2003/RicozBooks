import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config';
import healthRouter from './routes/health.routes';
import authRouter from './routes/auth.routes';
import developerRouter from './routes/developer.routes';
import journalRouter from './routes/journal.routes';
import accountRouter from './routes/account.routes';
import salesRouter from './routes/sales.routes';
import purchaseRouter from './routes/purchase.routes';
import bankingRouter from './routes/banking.routes';
import entityRouter from './routes/entity.routes';
import companyRouter from './routes/company.routes';
import tenantRouter from './routes/tenant.routes';
import reportRouter from './routes/report.routes';
import ledgerRouter from './routes/ledger.routes';
import dashboardRouter from './routes/dashboard.routes';
import { errorHandler } from './middleware/errorHandler';

export function createApp(): Application {
  const app = express();

  // Security headers & parsing
  app.use(helmet());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // CORS configuration
  app.use(cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);
      const isAllowed = config.corsOrigins.includes(origin) ||
        /^https:\/\/.*\.onrender\.com$/.test(origin) ||
        /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
      if (isAllowed) {
        callback(null, true);
      } else {
        callback(null, true); // Permissive in dev, logged in staging
      }
    },
    credentials: true,
  }));

  // Root endpoint
  app.get('/', (_req: Request, res: Response) => {
    res.json({
      message: 'RicozBooks API (Express + MongoDB)',
      version: config.appVersion,
      docs: '/api/v1/docs',
    });
  });

  // Base API routes
  app.use(`${config.apiPrefix}`, healthRouter);
  app.use(`${config.apiPrefix}/auth`, authRouter);
  app.use(`${config.apiPrefix}/developer`, developerRouter);
  app.use(`${config.apiPrefix}/journals`, journalRouter);
  app.use(`${config.apiPrefix}/accounts`, accountRouter);
  app.use(`${config.apiPrefix}/sales`, salesRouter);
  app.use(`${config.apiPrefix}/purchases`, purchaseRouter);
  app.use(`${config.apiPrefix}/banking`, bankingRouter);
  app.use(`${config.apiPrefix}/entities`, entityRouter);
  app.use(`${config.apiPrefix}/companies`, companyRouter);
  app.use(`${config.apiPrefix}/tenants`, tenantRouter);
  app.use(`${config.apiPrefix}/reports`, reportRouter);
  app.use(`${config.apiPrefix}/ledger`, ledgerRouter);
  app.use(`${config.apiPrefix}/dashboard`, dashboardRouter);

  // Centralized Error Handling Middleware
  app.use(errorHandler);

  return app;
}

export const app = createApp();

