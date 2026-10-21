import express from 'express';
import cors from 'cors';
import dns from 'dns';
import { DOWNLOADS_DIR } from './config/env';
import apiRouter from './routes/index';
import { errorHandler } from './middleware/errorHandler';

// Prefer IPv4 to avoid ConnectTimeoutError on unroutable IPv6 addresses
if (typeof dns.setDefaultResultOrder === 'function') {
  dns.setDefaultResultOrder('ipv4first');
}

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  // Serve downloaded media files for stream / video preview
  app.use('/media', express.static(DOWNLOADS_DIR));

  // Mount API routers
  app.use('/api', apiRouter);

  // Error handling middleware
  app.use(errorHandler);

  return app;
}
