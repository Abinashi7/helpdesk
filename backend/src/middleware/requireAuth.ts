import { type Request, type Response, type NextFunction } from 'express';
import { fromNodeHeaders } from 'better-auth/node';
import { auth, type Session } from '../lib/auth.js';

declare global {
  namespace Express {
    interface Locals {
      session: Session['session'];
      user: Session['user'];
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });

  if (!session) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  res.locals.session = session.session;
  res.locals.user = session.user;
  next();
}
