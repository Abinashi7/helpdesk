import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';
import { TicketCategory } from '@helpdesk/core';
import { boss } from '../lib/boss.js';
import { prisma } from '../lib/db.js';
import { logger } from '../lib/logger.js';
import type { Ticket } from '../lib/types.js';

const CATEGORIES = Object.values(TicketCategory).join(', ');

export async function registerClassifyWorker() {
  await boss.createQueue('classify');
  await boss.work<{ ticket: Ticket }>('classify', async ([job]) => {
    const { ticket } = job.data;

    const { text } = await generateText({
      model: openai('gpt-5-nano'),
      system: `You are a customer support ticket classifier. Given a ticket subject and body, respond with exactly one category from this list: ${CATEGORIES}. Output only the category name, nothing else.`,
      prompt: `Subject: ${ticket.subject}\n\n${ticket.body}`,
    });

    const category = text.trim().toLowerCase() as TicketCategory;
    if (!Object.values(TicketCategory).includes(category)) {
      logger.warn({ ticketId: ticket.id, raw: text }, 'classify: unrecognised category, skipping');
      return;
    }

    await prisma.ticket.update({ where: { id: ticket.id }, data: { category } });
    logger.info({ ticketId: ticket.id, category }, 'classify: ticket categorised');
  });
}
