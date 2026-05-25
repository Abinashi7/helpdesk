import { readFileSync } from 'fs';
import path from 'path';
import { openai } from '@ai-sdk/openai';
import { generateObject, jsonSchema } from 'ai';
import { TicketStatus, ReplySenderType } from '@helpdesk/core';
import { boss } from '../lib/boss.js';
import { prisma } from '../lib/db.js';
import { logger } from '../lib/logger.js';
import type { Ticket } from '../lib/types.js';

const knowledgeBase = readFileSync(
  path.resolve(import.meta.dir, '../../../knowledge-base.md'),
  'utf-8',
);

type AutoResolveResult = { shouldResolve: boolean; confidence: number; replyBody: string };

const schema = jsonSchema<AutoResolveResult>({
  type: 'object',
  properties: {
    shouldResolve: { type: 'boolean' },
    confidence: { type: 'number', minimum: 0, maximum: 1 },
    replyBody: { type: 'string' },
  },
  required: ['shouldResolve', 'confidence', 'replyBody'],
  additionalProperties: false,
});

const SYSTEM_PROMPT = `You are a customer support AI for Code with Mosh. Use ONLY the knowledge base below to answer customer questions.

Set shouldResolve to false and leave replyBody empty if ANY of these conditions apply:
- The customer threatens legal action
- The customer requests a refund outside the 30-day window
- The customer disputes a charge or mentions a chargeback
- The issue involves account security concerns
- Your confidence is below 0.8

When shouldResolve is true, write a complete, professional reply in replyBody.
Start with "Hi [customer first name]," and close with "Best regards,\\nCode with Mosh Support".

KNOWLEDGE BASE:
${knowledgeBase}`;

export async function registerAutoResolveWorker() {
  const { id: systemAuthorId } = await prisma.user.findUniqueOrThrow({
    where: { email: 'admin@example.com' },
    select: { id: true },
  });

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
      data: { status: TicketStatus.processing },
    });

    try {
      const { object } = await generateObject({
        model: openai('gpt-5-nano'),
        schema,
        system: SYSTEM_PROMPT,
        prompt: `Subject: ${ticket.subject}\nFrom: ${ticket.fromName} (${ticket.fromEmail})\n\n${ticket.body}`,
      });

      if (!object.shouldResolve || object.confidence < 0.8) {
        await prisma.ticket.update({
          where: { id: ticket.id },
          data: { status: TicketStatus.open },
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
          data: { status: TicketStatus.resolved },
        }),
      ]);

      logger.info({ ticketId: ticket.id }, 'auto-resolve: ticket resolved by AI');
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
