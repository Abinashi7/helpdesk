import { Router, type IRouter } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { listTickets } from '../services/tickets.js';

const router: IRouter = Router();

router.get('/', requireAuth, async (_req, res) => {
  const tickets = await listTickets();
  res.json({ tickets });
});

export default router;
