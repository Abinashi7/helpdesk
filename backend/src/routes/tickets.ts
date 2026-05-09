import { Router, type IRouter } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/requireAuth.js';
import { assignTicketSchema, updateTicketSchema } from '@helpdesk/core';
import { validate } from '../lib/validate.js';
import { listTickets, getTicket, assignTicket, updateTicket } from '../services/tickets.js';
import { getUserById } from '../services/users.js';

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

router.patch('/:id', requireAuth, async (req, res) => {
  const id = parseInt(req.params['id'] as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid ticket id' }); return; }

  const data = validate(updateTicketSchema, req.body, res);
  if (!data) return;

  const ticket = await getTicket(id);
  if (!ticket) { res.status(404).json({ error: 'Not found' }); return; }

  const updated = await updateTicket(id, data);
  res.json(updated);
});

router.patch('/:id/assign', requireAuth, async (req, res) => {
  const id = parseInt(req.params['id'] as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid ticket id' }); return; }

  const data = validate(assignTicketSchema, req.body, res);
  if (!data) return;

  const ticket = await getTicket(id);
  if (!ticket) { res.status(404).json({ error: 'Not found' }); return; }

  if (data.assignedToId) {
    const agent = await getUserById(data.assignedToId);
    if (!agent) { res.status(404).json({ error: 'Agent not found' }); return; }
  }

  const updated = await assignTicket(id, data.assignedToId);
  res.json(updated);
});

export default router;
