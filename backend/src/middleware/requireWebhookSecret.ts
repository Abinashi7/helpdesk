import type { Request, Response, NextFunction } from 'express';
import { env } from '../config/env.js';

export function requireWebhookSecret(req: Request, res: Response, next: NextFunction) {
  console.log('Checking webhook secret...', env.WEBHOOK_SECRET ? env.WEBHOOK_SECRET : 'not set');
  if (!env.WEBHOOK_SECRET) {
    next();
    return;
  }

  const fromHeader = req.headers['x-webhook-secret'];
  const fromQuery = req.query['webhook_secret'];
  const provided = typeof fromHeader === 'string' ? fromHeader : fromQuery;

  if (provided !== env.WEBHOOK_SECRET) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  next();
}
