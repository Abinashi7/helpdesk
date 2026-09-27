import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TicketCategory, TicketStatus, type AiDecisionAudit, type Ticket } from '@helpdesk/core';
import * as api from '@/lib/api';
import { renderWithQuery } from '@/test/renderWithQuery';
import TicketSidebar from './TicketSidebar';

vi.mock('@/lib/api');

const audit: AiDecisionAudit = {
  schemaVersion: 1,
  provider: 'typesafe',
  model: 'jev-1.13.0',
  decision: 'human_review',
  reasons: ['legal_threat', 'kb_not_complete'],
  category: {
    choice: TicketCategory.billing,
    confidence: 0.91,
    probabilities: { billing: 0.91, technical: 0.02, account: 0.02, general: 0.05 },
  },
  kb: {
    answerProbability: 0.72,
    sectionId: 'section_4',
    sectionTitle: '4. Refund Policy',
    sectionConfidence: 0.86,
    sectionProbabilities: { section_4: 0.9, none: 0.1 },
  },
  escalation: {
    genuineSupport: 0.99,
    legalThreat: 0.93,
    chargebackOrDispute: 0.01,
    accountSecurity: 0.01,
    refundRequiresHuman: 0.1,
  },
  usage: {
    typesafe: { inputTokens: 1000, outputTokens: 20 },
    openai: null,
  },
};

const ticket: Ticket = {
  id: 1,
  subject: 'Refund question',
  body: 'Please help',
  fromEmail: 'customer@example.com',
  fromName: 'Customer',
  category: TicketCategory.billing,
  status: TicketStatus.open,
  assignedTo: null,
  resolvedByAi: false,
  aiConfidence: 0.72,
  aiKbSection: '4. Refund Policy',
  aiDecision: audit,
  createdAt: '2026-09-20T12:00:00Z',
  updatedAt: '2026-09-20T12:00:00Z',
};

describe('TicketSidebar AI triage audit', () => {
  beforeEach(() => {
    vi.mocked(api.apiFetch).mockResolvedValue({ agents: [] });
  });

  it('renders the TypeSafe decision summary and human-readable reasons', () => {
    renderWithQuery(<TicketSidebar ticket={ticket} />);

    expect(screen.getByText(/Sent to human review/)).toHaveTextContent('jev-1.13.0');
    expect(screen.getByText(/KB coverage 0.72/)).toHaveTextContent('0.86 section confidence');
    expect(screen.getByText('Possible legal threat')).toBeInTheDocument();
    expect(screen.getByText('Knowledge base does not fully answer the request')).toBeInTheDocument();
  });

  it('keeps the legacy confidence display for historical tickets', () => {
    renderWithQuery(<TicketSidebar ticket={{ ...ticket, aiDecision: null, aiConfidence: 0.84 }} />);

    expect(screen.getByText(/Escalated at/)).toHaveTextContent('0.84 confidence');
    expect(screen.getByText(/below the 0.85 threshold/)).toBeInTheDocument();
  });
});
