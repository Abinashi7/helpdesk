import crypto from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';

/**
 * Mailgun signs inbound route payloads with HMAC-SHA256 over `timestamp + token`,
 * keyed by the webhook signing key. The signature travels in the request *body*,
 * so this middleware must run after the body parsers.
 *
 * Replay protection leans on `timestamp` only as defence in depth — a replayed
 * payload carries the same `messageId` and is deduplicated by
 * `createTicketFromEmail`. The window is deliberately generous because Mailgun
 * retries failed route deliveries for several hours, and a tight window would
 * reject legitimate retries.
 */
const MAX_TIMESTAMP_AGE_SECONDS = 24 * 60 * 60;

function timingSafeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function verifySignature(timestamp: string, token: string, signature: string): boolean {
  if (!env.MAILGUN_SIGNING_KEY) return false;

  const expected = crypto
    .createHmac('sha256', env.MAILGUN_SIGNING_KEY)
    .update(timestamp.concat(token))
    .digest('hex');

  return timingSafeEqual(signature, expected);
}

export function verifyMailgunWebhook(req: Request, res: Response, next: NextFunction) {
  const body = (req.body ?? {}) as Record<string, unknown>;

  // Production path: a signing key is configured, so every request must carry a
  // valid Mailgun signature.
  if (env.MAILGUN_SIGNING_KEY) {
    const timestamp = typeof body.timestamp === 'string' ? body.timestamp : undefined;
    const token = typeof body.token === 'string' ? body.token : undefined;
    const signature = typeof body.signature === 'string' ? body.signature : undefined;

    if (!timestamp || !token || !signature) {
      logger.warn('verifyMailgunWebhook: missing signature fields');
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const age = Math.floor(Date.now() / 1000) - Number(timestamp);
    if (!Number.isFinite(age) || age > MAX_TIMESTAMP_AGE_SECONDS) {
      logger.warn('verifyMailgunWebhook: stale or invalid timestamp');
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!verifySignature(timestamp, token, signature)) {
      logger.warn('verifyMailgunWebhook: signature mismatch');
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    next();
    return;
  }

  // Local / e2e path: no signing key configured, so fall back to the shared
  // secret that tests and manual curl requests can supply.
  if (env.WEBHOOK_SECRET) {
    const fromHeader = req.headers['x-webhook-secret'];
    const fromQuery = req.query['webhook_secret'];
    const provided = typeof fromHeader === 'string' ? fromHeader : fromQuery;

    if (typeof provided !== 'string' || !timingSafeEqual(provided, env.WEBHOOK_SECRET)) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    next();
    return;
  }

  if (env.NODE_ENV === 'production') {
    logger.error(
      'verifyMailgunWebhook: neither MAILGUN_SIGNING_KEY nor WEBHOOK_SECRET is set — refusing unauthenticated inbound email',
    );
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  next();
}
