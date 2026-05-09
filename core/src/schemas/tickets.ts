import { z } from 'zod';
import { TicketStatus, TicketCategory } from '../enums.js';

export const assignTicketSchema = z.object({
  assignedToId: z.string().min(1).nullable(),
});

export type AssignTicketInput = z.infer<typeof assignTicketSchema>;

export const updateTicketSchema = z.object({
  status: z.nativeEnum(TicketStatus).optional(),
  category: z.nativeEnum(TicketCategory).nullable().optional(),
});

export type UpdateTicketInput = z.infer<typeof updateTicketSchema>;
