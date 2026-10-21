import { Request, Response, NextFunction } from 'express';

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  console.error('[Klyp Server Error]:', err);
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  
  if (res.headersSent) {
    return next(err);
  }

  res.status(status).json({
    error: message,
    timestamp: new Date().toISOString()
  });
}
