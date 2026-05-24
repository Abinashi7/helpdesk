import { Router, type IRouter } from 'express';
import { z } from 'zod';
import { TicketCategory } from '@helpdesk/core';
import { env } from '../config/env.js';
import { validate } from '../lib/validate.js';
import { createTicketFromEmail } from '../services/tickets.js';
import { classifyQueue } from '../lib/queue.js';

const router: IRouter = Router();

const inboundEmailSchema = z.object({
  subject:   z.string().min(1).max(500),
  body:      z.string().min(1).max(100_000),
  fromEmail: z.string().email().max(255),
  fromName:  z.string().min(1).max(100),
  category:  z.nativeEnum(TicketCategory).optional(),
  messageId: z.string().max(255).optional(),
});

router.post('/email', async (req, res) => {
  const { token } = req.query as { token?: string };
  if (env.WEBHOOK_SECRET && token !== env.WEBHOOK_SECRET) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const data = validate(inboundEmailSchema, req.body, res);
  if (!data) return;

  const ticket = await createTicketFromEmail(data);

  if (!ticket.category) {
    classifyQueue.add('classify', { ticket });
  }

  res.json({ ok: true, ticketId: ticket.id });
});

export default router;
