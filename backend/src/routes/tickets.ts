import { Router, type IRouter, type RequestHandler } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';
import { requireAuth } from '../middleware/requireAuth.js';
import { assignTicketSchema, updateTicketSchema, createReplySchema, polishReplySchema, simulateEmailSchema, ReplySenderType } from '@helpdesk/core';
import { validate } from '../lib/validate.js';
import { listTickets, getTicket, assignTicket, updateTicket, getReplies, createReply, getTicketStats, getDailyVolume, createTicketFromEmail } from '../services/tickets.js';
import { boss } from '../lib/boss.js';
import { getUserById } from '../services/users.js';
import { env } from '../config/env.js';

const router: IRouter = Router();

/**
 * The summarize and polish endpoints each cost an OpenAI call. On the public demo
 * they sit behind published credentials, so cap them per signed-in user. Off outside
 * demo mode — real agents should not be throttled.
 */
const aiLimiter: RequestHandler = env.DEMO_MODE
  ? rateLimit({
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 20,
      standardHeaders: true,
      legacyHeaders: false,
      keyGenerator: (_req, res) => res.locals['user'].id as string,
      message: { error: 'Demo limit reached for AI actions. Please try again later.' },
    })
  : (_req, _res, next) => next();

const ticketQuerySchema = z.object({
  sortBy: z.enum(['subject', 'fromName', 'category', 'status', 'createdAt']).default('createdAt'),
  sortDir: z.enum(['asc', 'desc']).default('desc'),
  status: z.enum(['new', 'processing', 'open', 'pending', 'resolved', 'closed']).optional(),
  category: z.enum(['billing', 'technical', 'account', 'general']).optional(),
  search: z.string().min(1).max(255).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
});

router.get('/', requireAuth, async (req, res) => {
  const { sortBy, sortDir, status, category, search, page, pageSize } = ticketQuerySchema.parse(req.query);
  const { tickets, total } = await listTickets({ sortBy, sortDir, status, category, search, page, pageSize });
  res.json({ tickets, total });
});

/**
 * Demo-only counterpart to the Mailgun inbound webhook: creates a ticket and enqueues
 * the same auto-resolve job, so a visitor can watch the AI pipeline run
 * without sending real email. Off unless DEMO_MODE is set.
 */
router.post('/simulate-email', requireAuth, async (req, res) => {
  if (!env.DEMO_MODE) {
    res.status(404).json({ error: 'Not found' });
    return;
  }

  const data = validate(simulateEmailSchema, req.body, res);
  if (!data) return;

  const ticket = await createTicketFromEmail({
    ...data,
    messageId: `demo-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
  });

  boss.send('auto-resolve', { ticket });

  res.status(201).json({ ticketId: ticket.id });
});

router.get('/stats', requireAuth, async (_req, res) => {
  const stats = await getTicketStats();
  res.json(stats);
});

router.get('/daily-volume', requireAuth, async (_req, res) => {
  const data = await getDailyVolume();
  res.json(data);
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

router.get('/:id/replies', requireAuth, async (req, res) => {
  const id = parseInt(req.params['id'] as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid ticket id' }); return; }
  const ticket = await getTicket(id);
  if (!ticket) { res.status(404).json({ error: 'Not found' }); return; }
  const replies = await getReplies(id);
  res.json({ replies });
});

router.post('/:id/replies', requireAuth, async (req, res) => {
  const id = parseInt(req.params['id'] as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid ticket id' }); return; }
  const data = validate(createReplySchema, req.body, res);
  if (!data) return;
  const ticket = await getTicket(id);
  if (!ticket) { res.status(404).json({ error: 'Not found' }); return; }
  const reply = await createReply(id, res.locals.user.id, data.body, data.senderType, data.bodyHtml);
  res.status(201).json(reply);

  if (data.senderType === ReplySenderType.agent) {
    boss.send('send-email', {
      to: ticket.fromEmail,
      subject: `Re: ${ticket.subject}`,
      text: data.body,
      ...(data.bodyHtml && { html: data.bodyHtml }),
    });
  }
});

router.post('/:id/summarize', requireAuth, aiLimiter, async (req, res) => {
  const id = parseInt(req.params['id'] as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid ticket id' }); return; }

  const ticket = await getTicket(id);
  if (!ticket) { res.status(404).json({ error: 'Not found' }); return; }

  const replies = await getReplies(id);

  const parts = [
    `Subject: ${ticket.subject}`,
    `From: ${ticket.fromName} <${ticket.fromEmail}>`,
    `\nOriginal message:\n${ticket.body}`,
  ];

  if (replies.length > 0) {
    parts.push('\nConversation replies:');
    for (const reply of replies) {
      parts.push(`\n[${reply.senderType === 'agent' ? 'Agent' : 'Customer'}] ${reply.author.name}:\n${reply.body}`);
    }
  }

  const { text } = await generateText({
    model: openai('gpt-5-nano'),
    system: `You are a helpful assistant that summarizes customer support tickets concisely.
Summarize in 2–4 sentences covering: the customer's issue or request, any key context, and the current state of the conversation (if replies exist).
Do not include greetings, preamble, or commentary — just the summary.`,
    prompt: parts.join('\n'),
  });

  res.json({ summary: text });
});

router.post('/:id/replies/polish', requireAuth, aiLimiter, async (req, res) => {
  const id = parseInt(req.params['id'] as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid ticket id' }); return; }
  const ticket = await getTicket(id);
  if (!ticket) { res.status(404).json({ error: 'Not found' }); return; }
  const data = validate(polishReplySchema, req.body, res);
  if (!data) return;

  const agentName = res.locals.user.name;
  const domain = res.locals.user.email.split('@')[1];
  const customerFirstName = ticket.fromName.split(' ')[0];

  const { text } = await generateText({
    model: openai('gpt-5-nano'),
    system: `You are a professional customer support agent editor. Rewrite the draft reply below into a polished, professional support response.

Rules:
- Use a warm but professional tone — courteous, clear, and confident
- Replace casual or informal phrasing with professional language (e.g. "hey fixed it try now" → "I'm pleased to let you know that the issue has been resolved. Please give it another try and let us know if you need any further assistance.")
- Write in complete, well-structured sentences
- Begin the reply with exactly: "Hi ${customerFirstName}," on its own line
- Keep the same meaning and intent as the draft
- Do not add filler phrases like "I hope this email finds you well"
- End the reply with this exact signature on a new line:

${agentName}
${domain}

- Return only the rewritten reply text with the greeting and signature, no preamble or explanation`,
    prompt: data.body,
  });

  res.json({ polished: text });
});

export default router;
