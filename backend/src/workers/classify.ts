import { Worker } from 'bullmq';
import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';
import { TicketCategory } from '@helpdesk/core';
import { connection } from '../lib/queue.js';
import type { Ticket } from '../lib/types.js';
import { prisma } from '../lib/db.js';
import { logger } from '../lib/logger.js';

const CATEGORIES = Object.values(TicketCategory).join(', ');

export const classifyWorker = new Worker(
  'classify',
  async (job) => {
    const { ticket } = job.data as { ticket: Ticket };
    const { id: ticketId, subject, body } = ticket;

    const { text } = await generateText({
      model: openai('gpt-5-nano'),
      system: `You are a customer support ticket classifier. Given a ticket subject and body, respond with exactly one category from this list: ${CATEGORIES}. Output only the category name, nothing else.`,
      prompt: `Subject: ${subject}\n\n${body}`,
    });

    const category = text.trim().toLowerCase() as TicketCategory;
    if (!Object.values(TicketCategory).includes(category)) {
      logger.warn({ ticketId, raw: text }, 'classify: unrecognised category, skipping');
      return;
    }

    await prisma.ticket.update({
      where: { id: ticketId },
      data: { category },
    });

    logger.info({ ticketId, category }, 'classify: ticket categorised');
  },
  { connection },
);

classifyWorker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, err }, 'classify: job failed');
});
