import { z } from 'zod';
import { TicketStatus, TicketCategory, ReplySenderType } from '../enums.js';

export type AiDecisionReason =
  | 'not_genuine_support_request'
  | 'legal_threat'
  | 'chargeback_or_dispute'
  | 'account_security'
  | 'refund_requires_human'
  | 'kb_not_complete'
  | 'kb_section_uncertain'
  | 'typesafe_error'
  | 'generation_error';

export interface AiDecisionAudit {
  schemaVersion: 1;
  provider: 'typesafe';
  model: string;
  decision: 'auto_resolve' | 'human_review';
  reasons: AiDecisionReason[];
  category: {
    choice: TicketCategory;
    confidence: number;
    probabilities: Record<TicketCategory, number>;
  } | null;
  kb: {
    answerProbability: number;
    sectionId: string | null;
    sectionTitle: string | null;
    sectionConfidence: number;
    sectionProbabilities: Record<string, number>;
  } | null;
  escalation: {
    genuineSupport: number;
    legalThreat: number;
    chargebackOrDispute: number;
    accountSecurity: number;
    refundRequiresHuman: number;
  } | null;
  usage: {
    typesafe: { inputTokens: number; outputTokens: number } | null;
    openai: {
      model: 'gpt-5-nano';
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    } | null;
  };
}

export interface Ticket {
  id: number;
  subject: string;
  body: string;
  fromEmail: string;
  fromName: string;
  category: TicketCategory | null;
  status: TicketStatus;
  assignedTo: { id: string; name: string } | null;
  resolvedByAi: boolean;
  /** Auto-resolve worker's confidence (0-1) and the KB section it grounded the answer in. */
  aiConfidence: number | null;
  aiKbSection: string | null;
  aiDecision: AiDecisionAudit | null;
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

export const polishReplySchema = z.object({
  body: z.string().min(1).max(10_000),
});

export type PolishReplyInput = z.infer<typeof polishReplySchema>;

/** Demo-only: lets a visitor inject a ticket through the same pipeline the Mailgun webhook uses. */
export const simulateEmailSchema = z.object({
  subject:   z.string().trim().min(1).max(500),
  body:      z.string().trim().min(1).max(10_000),
  fromName:  z.string().trim().min(1).max(100),
  fromEmail: z.string().trim().email().max(255),
});

export type SimulateEmailInput = z.infer<typeof simulateEmailSchema>;

export interface TicketStats {
  total: number;
  open: number;
  resolvedByAi: number;
  aiResolutionPercent: number;
  avgResolutionHours: number | null;
}
