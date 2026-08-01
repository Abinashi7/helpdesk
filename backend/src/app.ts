import { existsSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import express, { type Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import * as Sentry from '@sentry/node';
import { ZodError } from 'zod';
import { toNodeHandler } from 'better-auth/node';
import { env } from './config/env.js';
import { auth } from './lib/auth.js';
import { errorHandler } from './middleware/error.js';
import usersRouter from './routes/users.js';
import ticketsRouter from './routes/tickets.js';
import webhooksRouter from './routes/webhooks.js';

export function createApp(): Application {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: env.FRONTEND_URL, credentials: true }));

  // Better Auth handler must come before express.json()
  if (env.NODE_ENV === 'production') {
    const authLimiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 20,
      standardHeaders: true,
      legacyHeaders: false,
      message: { error: 'Too many requests, please try again later.' },
    });
    app.all('/api/auth/*splat', authLimiter, toNodeHandler(auth));
  } else {
    app.all('/api/auth/*splat', toNodeHandler(auth));
  }

  app.use(express.json());
  app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.use('/api/users', usersRouter);
  app.use('/api/tickets', ticketsRouter);
  app.use('/api/webhooks', webhooksRouter);

  if (env.SENTRY_DSN) {
    Sentry.setupExpressErrorHandler(app, {
      shouldHandleError: (err) => !(err instanceof ZodError),
    });
  }

  // In production the backend serves the built React app and handles SPA routing.
  if (env.NODE_ENV === 'production') {
    const distPath = fileURLToPath(new URL('../../frontend/dist', import.meta.url));
    if (existsSync(distPath)) {
      app.use(express.static(distPath));
      app.use((req, res, next) => {
        if (req.method === 'GET' && !req.path.startsWith('/api/')) {
          res.sendFile(join(distPath, 'index.html'));
        } else {
          next();
        }
      });
    }
  }

  app.use(errorHandler);

  return app;
}
