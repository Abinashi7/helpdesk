import { Router, type IRouter } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/requireAuth.js';
import { listTickets, getTicket } from '../services/tickets.js';

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

router.get('/:id', requireAuth, async (req, res) => {
  const id = parseInt(req.params['id'] as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid ticket id' }); return; }
  const ticket = await getTicket(id);
  if (!ticket) { res.status(404).json({ error: 'Not found' }); return; }
  res.json(ticket);
});

export default router;
