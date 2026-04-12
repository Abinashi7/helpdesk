import express, { type Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { toNodeHandler } from 'better-auth/node';
import { env } from './config/env.js';
import { auth } from './lib/auth.js';
import { errorHandler } from './middleware/error.js';

export function createApp(): Application {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: env.FRONTEND_URL, credentials: true }));

  // Better Auth handler must come before express.json()
  app.all('/api/auth/*splat', toNodeHandler(auth));

  app.use(express.json());
  app.use(morgan('dev'));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.use(errorHandler);

  return app;
}
