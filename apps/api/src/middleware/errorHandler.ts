import { Request, Response, NextFunction } from 'express';

export function errorHandler(err: any, req: Request, res: Response, _next: NextFunction) {
  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'Internal Server Error';

  console.error(`[API ERROR] ${req.method} ${req.originalUrl}:`, err);

  // Preserve CORS headers even on unhandled errors
  const origin = req.headers.origin as string;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }

  return res.status(statusCode).json({
    detail: message,
    error: err.name || 'Error',
    path: req.originalUrl,
    timestamp: new Date().toISOString(),
  });
}

