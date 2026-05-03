import express, { type Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
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
  app.use(morgan('dev'));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.use('/api/users', usersRouter);
  app.use('/api/tickets', ticketsRouter);
  app.use('/api/webhooks', webhooksRouter);

  app.use(errorHandler);

  return app;
}
