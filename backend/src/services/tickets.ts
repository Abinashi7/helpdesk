import { TicketCategory, TicketStatus, ReplySenderType } from '@helpdesk/core';
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
    ...(!status && { status: { notIn: [TicketStatus.processing, TicketStatus.resolved] } }),
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
      include: { assignedTo: assignedToSelect },
    }),
    prisma.ticket.count({ where }),
  ]);
  return { tickets, total };
}

const assignedToSelect = { select: { id: true, name: true } } as const;

export async function getTicket(id: number) {
  return prisma.ticket.findUnique({
    where: { id },
    include: { assignedTo: assignedToSelect },
  });
}

export async function assignTicket(id: number, assignedToId: string | null) {
  return prisma.ticket.update({
    where: { id },
    data: { assignedToId },
    include: { assignedTo: assignedToSelect },
  });
}

export async function updateTicket(id: number, data: { status?: TicketStatus; category?: TicketCategory | null }) {
  return prisma.ticket.update({
    where: { id },
    data: {
      ...data,
      ...(data.status === TicketStatus.resolved && { resolvedAt: new Date() }),
    },
    include: { assignedTo: assignedToSelect },
  });
}

interface InboundEmail {
  subject: string;
  body: string;
  fromEmail: string;
  fromName: string;
  category?: TicketCategory;
  messageId?: string;
}

const replySelect = {
  id: true,
  body: true,
  bodyHtml: true,
  senderType: true,
  createdAt: true,
  author: { select: { id: true, name: true } },
} as const;

export async function getReplies(ticketId: number) {
  return prisma.reply.findMany({
    where: { ticketId },
    orderBy: { createdAt: 'asc' },
    select: replySelect,
  });
}

export async function createReply(ticketId: number, authorId: string, body: string, senderType: ReplySenderType, bodyHtml?: string) {
  return prisma.reply.create({
    data: { ticketId, authorId, body, senderType, ...(bodyHtml !== undefined && { bodyHtml }) },
    select: replySelect,
  });
}

export async function createTicketFromEmail(data: InboundEmail) {
  if (data.messageId) {
    const existing = await prisma.ticket.findUnique({ where: { messageId: data.messageId } });
    if (existing) return existing;
  }
  return prisma.ticket.create({ data });
}

export async function getDailyVolume(): Promise<{ date: string; count: number }[]> {
  const rows = await prisma.$queryRaw<{ day: Date; count: bigint }[]>`
    SELECT
      DATE_TRUNC('day', "createdAt") AS day,
      COUNT(*)                        AS count
    FROM tickets
    WHERE "createdAt" >= NOW() - INTERVAL '30 days'
    GROUP BY day
    ORDER BY day ASC
  `;

  const byDay = new Map(rows.map((r) => [r.day.toISOString().slice(0, 10), Number(r.count)]));

  const result: { date: string; count: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setUTCHours(0, 0, 0, 0);
    d.setUTCDate(d.getUTCDate() - i);
    const key = d.toISOString().slice(0, 10);
    result.push({ date: key, count: byDay.get(key) ?? 0 });
  }
  return result;
}

export interface TicketStats {
  total: number;
  open: number;
  resolvedByAi: number;
  aiResolutionPercent: number;
  avgResolutionHours: number | null;
}

interface TicketStatsRow {
  total: bigint;
  open: bigint;
  resolved_by_ai: bigint;
  ai_resolution_percent: number;
  avg_resolution_hours: number | null;
}

export async function getTicketStats(): Promise<TicketStats> {
  const [row] = await prisma.$queryRaw<[TicketStatsRow]>`SELECT * FROM get_ticket_stats()`;

  return {
    total: Number(row.total),
    open: Number(row.open),
    resolvedByAi: Number(row.resolved_by_ai),
    aiResolutionPercent: row.ai_resolution_percent,
    avgResolutionHours: row.avg_resolution_hours,
  };
}
