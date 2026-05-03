import { Router, type IRouter } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/requireAuth.js';
import { listTickets } from '../services/tickets.js';

const router: IRouter = Router();

const ticketQuerySchema = z.object({
  sortBy: z.enum(['subject', 'fromName', 'category', 'status', 'createdAt']).default('createdAt'),
  sortDir: z.enum(['asc', 'desc']).default('desc'),
  status: z.enum(['open', 'pending', 'closed']).optional(),
  category: z.enum(['billing', 'technical', 'account', 'general']).optional(),
  search: z.string().min(1).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
});

router.get('/', requireAuth, async (req, res) => {
  const { sortBy, sortDir, status, category, search, page, pageSize } = ticketQuerySchema.parse(req.query);
  const { tickets, total } = await listTickets({ sortBy, sortDir, status, category, search, page, pageSize });
  res.json({ tickets, total });
});

export default router;
