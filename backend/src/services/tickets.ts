import { TicketCategory } from '@helpdesk/core';
import { prisma } from '../lib/db.js';

export async function listTickets() {
  return prisma.ticket.findMany({ orderBy: { createdAt: 'desc' } });
}

interface InboundEmail {
  subject: string;
  body: string;
  fromEmail: string;
  fromName: string;
  category?: TicketCategory;
  messageId?: string;
}

export async function createTicketFromEmail(data: InboundEmail) {
  if (data.messageId) {
    const existing = await prisma.ticket.findUnique({ where: { messageId: data.messageId } });
    if (existing) return existing;
  }
  return prisma.ticket.create({ data });
}
