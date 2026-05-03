import { Router, type IRouter } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/requireAuth.js';
import { listTickets } from '../services/tickets.js';

const router: IRouter = Router();

const ticketSortSchema = z.object({
  sortBy: z.enum(['subject', 'fromName', 'category', 'status', 'createdAt']).default('createdAt'),
  sortDir: z.enum(['asc', 'desc']).default('desc'),
});

router.get('/', requireAuth, async (req, res) => {
  const { sortBy, sortDir } = ticketSortSchema.parse(req.query);
  const tickets = await listTickets({ sortBy, sortDir });
  res.json({ tickets });
});

export default router;
