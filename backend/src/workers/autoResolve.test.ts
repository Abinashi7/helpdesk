import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TicketCategory, TicketStatus, type AiDecisionAudit } from '@helpdesk/core';
import type { Ticket } from '../lib/types.js';
import type { KnowledgeBaseSection } from './triage.js';

const mocks = vi.hoisted(() => ({
  handler: undefined as ((jobs: Array<{ data: { ticket: Ticket } }>) => Promise<void>) | undefined,
  createQueue: vi.fn().mockResolvedValue(undefined),
  send: vi.fn().mockResolvedValue('email-job'),
  ticketFindUnique: vi.fn(),
  ticketUpdate: vi.fn(),
  ticketUpdateMany: vi.fn(),
  replyCreate: vi.fn(),
  transaction: vi.fn(),
  userFindUniqueOrThrow: vi.fn(),
  loggerInfo: vi.fn(),
  loggerError: vi.fn(),
}));

vi.mock('../lib/boss.js', () => ({
  boss: {
    createQueue: mocks.createQueue,
    send: mocks.send,
    work: vi.fn(async (_name: string, handler: typeof mocks.handler) => {
      mocks.handler = handler;
    }),
  },
}));

vi.mock('../lib/db.js', () => ({
  prisma: {
    user: { findUniqueOrThrow: mocks.userFindUniqueOrThrow },
    ticket: {
      findUnique: mocks.ticketFindUnique,
      update: mocks.ticketUpdate,
      updateMany: mocks.ticketUpdateMany,
    },
    reply: { create: mocks.replyCreate },
    $transaction: mocks.transaction,
  },
}));

vi.mock('../lib/logger.js', () => ({
  logger: { info: mocks.loggerInfo, error: mocks.loggerError },
}));

import { registerAutoResolveWorker, type AutoResolveDependencies } from './autoResolve.js';

const selectedSection: KnowledgeBaseSection = {
  id: 'section_1',
  title: '1. Account & Login Issues',
  content: '## 1. Account & Login Issues\nReset your password.',
};

function audit(decision: 'auto_resolve' | 'human_review' = 'auto_resolve'): AiDecisionAudit {
  return {
    schemaVersion: 1,
    provider: 'typesafe',
    model: 'jev-1.13.0',
    decision,
    reasons: decision === 'human_review' ? ['kb_not_complete'] : [],
    category: {
      choice: TicketCategory.account,
      confidence: 0.95,
      probabilities: { billing: 0.01, technical: 0.01, account: 0.95, general: 0.03 },
    },
    kb: {
      answerProbability: decision === 'auto_resolve' ? 0.97 : 0.5,
      sectionId: selectedSection.id,
      sectionTitle: selectedSection.title,
      sectionConfidence: 0.96,
      sectionProbabilities: { section_1: 0.96, none: 0.04 },
    },
    escalation: {
      genuineSupport: 0.99,
      legalThreat: 0.01,
      chargebackOrDispute: 0.01,
      accountSecurity: 0.01,
      refundRequiresHuman: 0.01,
    },
    usage: { typesafe: { inputTokens: 1000, outputTokens: 20 }, openai: null },
  };
}

function ticket(category: TicketCategory | null = null): Ticket {
  return {
    id: 42,
    subject: 'How do I reset my password?',
    body: 'I forgot my password.',
    fromEmail: 'customer@example.com',
    fromName: 'Jane Customer',
    category,
    status: TicketStatus.new,
  } as Ticket;
}

async function registerAndRun(overrides: {
  triage?: AutoResolveDependencies['triage'];
  generateReply?: AutoResolveDependencies['generateReply'];
  ticket?: Ticket;
} = {}) {
  const triage = overrides.triage ?? vi.fn<AutoResolveDependencies['triage']>().mockResolvedValue({ audit: audit(), selectedSection });
  const generateReply = overrides.generateReply ?? vi.fn<AutoResolveDependencies['generateReply']>().mockResolvedValue({
    text: 'Hi Jane,\n\nReset your password.\n\nBest regards,\nNorthwind Academy Support',
    usage: { promptTokens: 200, completionTokens: 50, totalTokens: 250 },
  });
  await registerAutoResolveWorker({ triage, generateReply });
  await mocks.handler!([{ data: { ticket: overrides.ticket ?? ticket() } }]);
  return { triage, generateReply };
}

describe('auto-resolve worker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.handler = undefined;
    mocks.userFindUniqueOrThrow.mockResolvedValue({ id: 'ai-agent' });
    mocks.ticketFindUnique.mockResolvedValue({ status: TicketStatus.new, category: null });
    mocks.ticketUpdate.mockResolvedValue({});
    mocks.ticketUpdateMany.mockResolvedValue({ count: 1 });
    mocks.replyCreate.mockResolvedValue({});
    mocks.transaction.mockResolvedValue([]);
  });

  it('uses one triage call, generates one reply, resolves, and queues email', async () => {
    const { triage, generateReply } = await registerAndRun();

    expect(triage).toHaveBeenCalledTimes(1);
    expect(generateReply).toHaveBeenCalledTimes(1);
    expect(vi.mocked(generateReply).mock.calls[0]![1]).toEqual(selectedSection);
    expect(mocks.replyCreate).toHaveBeenCalledTimes(1);
    expect(mocks.transaction).toHaveBeenCalledTimes(1);
    expect(mocks.send).toHaveBeenCalledWith('send-email', expect.objectContaining({
      to: 'customer@example.com',
    }));
    expect(mocks.ticketUpdate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: TicketStatus.resolved, category: TicketCategory.account }),
    }));
  });

  it('does not call OpenAI or email when Jev routes to a human', async () => {
    const triage = vi.fn().mockResolvedValue({ audit: audit('human_review'), selectedSection });
    const { generateReply } = await registerAndRun({ triage });

    expect(generateReply).not.toHaveBeenCalled();
    expect(mocks.replyCreate).not.toHaveBeenCalled();
    expect(mocks.send).not.toHaveBeenCalled();
    expect(mocks.ticketUpdate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: TicketStatus.open, assignedToId: null }),
    }));
  });

  it('fails closed when TypeSafe errors', async () => {
    const triage = vi.fn().mockRejectedValue(new Error('TypeSafe unavailable'));
    const { generateReply } = await registerAndRun({ triage });

    expect(generateReply).not.toHaveBeenCalled();
    expect(mocks.send).not.toHaveBeenCalled();
    expect(mocks.ticketUpdate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: TicketStatus.open, assignedToId: null }),
    }));
  });

  it('fails closed when reply generation errors', async () => {
    const generateReply = vi.fn().mockRejectedValue(new Error('OpenAI unavailable'));
    await registerAndRun({ generateReply });

    expect(mocks.replyCreate).not.toHaveBeenCalled();
    expect(mocks.send).not.toHaveBeenCalled();
    expect(mocks.ticketUpdate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: TicketStatus.open, assignedToId: null }),
    }));
  });

  it('preserves a category an agent set after the job was queued', async () => {
    // The job payload is a snapshot from ticket creation; the DB holds the agent's edit.
    mocks.ticketFindUnique.mockResolvedValue({ status: TicketStatus.new, category: TicketCategory.billing });
    await registerAndRun({ ticket: ticket(null) });

    expect(mocks.ticketUpdate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: TicketStatus.resolved, category: TicketCategory.billing }),
    }));
  });

  it('does not clear an existing category when TypeSafe errors', async () => {
    mocks.ticketFindUnique.mockResolvedValue({ status: TicketStatus.new, category: TicketCategory.technical });
    const triage = vi.fn().mockRejectedValue(new Error('TypeSafe unavailable'));
    await registerAndRun({ triage, ticket: ticket(null) });

    expect(mocks.ticketUpdate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: TicketStatus.open, category: TicketCategory.technical }),
    }));
  });

  it('reverts a still-processing ticket to open when an unexpected write fails', async () => {
    mocks.transaction.mockRejectedValue(new Error('DB unavailable'));

    await expect(registerAndRun()).rejects.toThrow('DB unavailable');

    expect(mocks.send).not.toHaveBeenCalled();
    expect(mocks.ticketUpdateMany).toHaveBeenCalledWith({
      where: { id: 42, status: TicketStatus.processing },
      data: { status: TicketStatus.open, assignedToId: null },
    });
  });
});
