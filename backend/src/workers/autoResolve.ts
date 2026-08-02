import { readFileSync } from 'fs';
import { openai } from '@ai-sdk/openai';
import { generateObject, jsonSchema } from 'ai';
import { TicketStatus, ReplySenderType } from '@helpdesk/core';
import { boss } from '../lib/boss.js';
import { prisma } from '../lib/db.js';
import { logger } from '../lib/logger.js';
import { env } from '../config/env.js';
import type { Ticket } from '../lib/types.js';

const knowledgeBase = readFileSync(
  new URL('../../../knowledge-base.md', import.meta.url),
  'utf-8',
);

type AutoResolveResult = { shouldResolve: boolean; confidence: number; replyBody: string };

const schema = jsonSchema<AutoResolveResult>({
  type: 'object',
  properties: {
    shouldResolve: {
      type: 'boolean',
      description: 'True ONLY if the knowledge base contains a direct, complete answer to the customer\'s question.',
    },
    confidence: {
      type: 'number',
      minimum: 0,
      maximum: 1,
      description: 'How confident you are (0–1) that the knowledge base fully covers this question. NOT a measure of how well you can generate a reply.',
    },
    replyBody: {
      type: 'string',
      description: 'The reply to send. Must be empty string if shouldResolve is false.',
    },
  },
  required: ['shouldResolve', 'confidence', 'replyBody'],
  additionalProperties: false,
});

const SYSTEM_PROMPT = `You are a customer support AI for Code with Mosh. Answer ONLY using the knowledge base below. Do NOT use outside knowledge or make up answers.

Set shouldResolve to false and replyBody to "" if ANY of these apply:
- The message is not a genuine support question (e.g. test emails, gibberish, greetings with no question)
- The question cannot be answered directly from the knowledge base
- The answer would require information not present in the knowledge base
- The customer threatens legal action
- The customer requests a refund outside the 30-day window
- The customer disputes a charge or mentions a chargeback
- The issue involves account security concerns
- Your confidence that the knowledge base fully covers the question is below 0.85

When shouldResolve is true, write a complete, professional reply in replyBody.
Start with "Hi [customer first name]," and close with "Best regards,\\nCode with Mosh Support".

KNOWLEDGE BASE:
${knowledgeBase}`;

export async function registerAutoResolveWorker() {
  const [{ id: systemAuthorId }, { id: aiAgentId }] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { email: env.SEED_ADMIN_EMAIL ?? 'admin@example.com' },
      select: { id: true },
    }),
    prisma.user.findUniqueOrThrow({ where: { email: 'ai@example.com' }, select: { id: true } }),
  ]);

  await boss.createQueue('auto-resolve');

  await boss.work<{ ticket: Ticket }>('auto-resolve', async ([job]) => {
    const { ticket } = job.data;

    const current = await prisma.ticket.findUnique({
      where: { id: ticket.id },
      select: { status: true },
    });
    if (current?.status !== TicketStatus.new) {
      logger.info({ ticketId: ticket.id }, 'auto-resolve: ticket no longer new, skipping');
      return;
    }

    await prisma.ticket.update({
      where: { id: ticket.id },
      data: { status: TicketStatus.processing, assignedToId: aiAgentId },
    });

    try {
      const { object } = await generateObject({
        model: openai('gpt-5-nano'),
        schema,
        system: SYSTEM_PROMPT,
        prompt: `Subject: ${ticket.subject}\nFrom: ${ticket.fromName} (${ticket.fromEmail})\n\n${ticket.body}`,
      });

      if (!object.shouldResolve || object.confidence < 0.85) {
        await prisma.ticket.update({
          where: { id: ticket.id },
          data: { status: TicketStatus.open, assignedToId: null },
        });
        logger.info({ ticketId: ticket.id, confidence: object.confidence }, 'auto-resolve: escalating to human agent');
        return;
      }

      await prisma.$transaction([
        prisma.reply.create({
          data: {
            ticketId: ticket.id,
            authorId: systemAuthorId,
            body: object.replyBody,
            senderType: ReplySenderType.agent,
          },
        }),
        prisma.ticket.update({
          where: { id: ticket.id },
          data: { status: TicketStatus.resolved, resolvedByAi: true, resolvedAt: new Date() },
        }),
      ]);

      logger.info({ ticketId: ticket.id }, 'auto-resolve: ticket resolved by AI');

      boss.send('send-email', {
        to: ticket.fromEmail,
        subject: `Re: ${ticket.subject}`,
        text: object.replyBody,
      });
    } catch (err) {
      logger.error({ ticketId: ticket.id, err }, 'auto-resolve: error, reverting to open');
      await prisma.ticket.update({
        where: { id: ticket.id },
        data: { status: TicketStatus.open },
      });
      throw err;
    }
  });
}
