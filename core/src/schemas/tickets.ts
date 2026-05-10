import { z } from 'zod';
import { TicketStatus, TicketCategory, ReplySenderType } from '../enums.js';

export interface Ticket {
  id: number;
  subject: string;
  body: string;
  fromEmail: string;
  fromName: string;
  category: TicketCategory | null;
  status: TicketStatus;
  assignedTo: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
}

export const assignTicketSchema = z.object({
  assignedToId: z.string().min(1).max(36).nullable(),
});

export type AssignTicketInput = z.infer<typeof assignTicketSchema>;

export const updateTicketSchema = z.object({
  status: z.nativeEnum(TicketStatus).optional(),
  category: z.nativeEnum(TicketCategory).nullable().optional(),
});

export type UpdateTicketInput = z.infer<typeof updateTicketSchema>;

export const createReplySchema = z.object({
  body:       z.string().trim().min(1).max(10_000),
  bodyHtml:   z.string().max(100_000).optional(),
  senderType: z.nativeEnum(ReplySenderType),
});

export type CreateReplyInput = z.infer<typeof createReplySchema>;
