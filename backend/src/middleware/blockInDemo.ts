import type { RequestHandler } from 'express';
import { env } from '../config/env.js';

/**
 * Blocks destructive routes on the public demo deployment. Pair with
 * `requireAuth` + `requireAdmin` — this is the last line of defence for when the
 * demo is shown with an admin account rather than the restricted agent one.
 */
export const blockInDemo: RequestHandler = (_req, res, next) => {
  if (env.DEMO_MODE) {
    res.status(403).json({ error: 'This action is disabled in the demo.' });
    return;
  }
  next();
};
