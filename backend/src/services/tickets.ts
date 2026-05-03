import { TicketCategory } from '@helpdesk/core';
import { prisma } from '../lib/db.js';

export interface ListTicketsOptions {
  sortBy?: 'subject' | 'fromName' | 'category' | 'status' | 'createdAt';
  sortDir?: 'asc' | 'desc';
}

export async function listTickets({ sortBy = 'createdAt', sortDir = 'desc' }: ListTicketsOptions = {}) {
  return prisma.ticket.findMany({ orderBy: { [sortBy]: sortDir } });
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
