import { TicketCategory, TicketStatus } from '@helpdesk/core';
import { prisma } from '../lib/db.js';

export interface ListTicketsOptions {
  sortBy?: 'subject' | 'fromName' | 'category' | 'status' | 'createdAt';
  sortDir?: 'asc' | 'desc';
  status?: TicketStatus;
  category?: TicketCategory;
  search?: string;
  page?: number;
  pageSize?: number;
}

export async function listTickets({
  sortBy = 'createdAt',
  sortDir = 'desc',
  status,
  category,
  search,
  page = 1,
  pageSize = 10,
}: ListTicketsOptions = {}) {
  const where = {
    ...(status && { status }),
    ...(category && { category }),
    ...(search && {
      OR: [
        { subject:   { contains: search, mode: 'insensitive' as const } },
        { fromName:  { contains: search, mode: 'insensitive' as const } },
        { fromEmail: { contains: search, mode: 'insensitive' as const } },
      ],
    }),
  };
  const [tickets, total] = await prisma.$transaction([
    prisma.ticket.findMany({
      orderBy: { [sortBy]: sortDir },
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.ticket.count({ where }),
  ]);
  return { tickets, total };
}

export async function getTicket(id: number) {
  return prisma.ticket.findUnique({ where: { id } });
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
