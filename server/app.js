import fs from 'node:fs';
import path from 'node:path';
import cookieParser from 'cookie-parser';
import express from 'express';
import helmet from 'helmet';
import { env } from './config/env.js';
import { AppError, errorHandler } from './middleware/errorHandler.js';
import adminRoutes from './routes/adminRoutes.js';
import authRoutes from './routes/authRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import metaRoutes from './routes/metaRoutes.js';
import profileRoutes from './routes/profileRoutes.js';
import taskRoutes from './routes/taskRoutes.js';

export function createApp() {
  const app = express();

  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(
    helmet({
      contentSecurityPolicy: false,
    })
  );
  app.use(cookieParser());
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      env: env.NODE_ENV,
      timestamp: new Date().toISOString(),
    });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/profile', profileRoutes);
  app.use('/api/meta', metaRoutes);
  app.use('/api/tasks', taskRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/admin', adminRoutes);

  app.use('/api', (_req, _res, next) => {
    next(new AppError(404, 'NOT_FOUND', 'Nie znaleziono zasobu API'));
  });

  if (env.NODE_ENV === 'production') {
    const distDir = path.resolve(process.cwd(), 'dist');
    const indexHtml = path.join(distDir, 'index.html');
    if (fs.existsSync(distDir)) {
      app.use(express.static(distDir));
      app.get(/^(?!\/api(?:\/|$)).*/, (_req, res, next) => {
        if (fs.existsSync(indexHtml)) {
          res.sendFile(indexHtml);
          return;
        }
        next();
      });
    }
  }

  app.use(errorHandler);

  return app;
}
