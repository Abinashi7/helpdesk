import { readFileSync } from 'fs';
import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';
import { TypeSafeClient } from '@typesafe-ai/sdk';
import { TicketStatus, ReplySenderType, type AiDecisionAudit } from '@helpdesk/core';
import { Prisma } from '../../generated/prisma/client.js';
import { boss } from '../lib/boss.js';
import { prisma } from '../lib/db.js';
import { logger } from '../lib/logger.js';
import { AI_AGENT_EMAIL } from '../lib/constants.js';
import type { Ticket } from '../lib/types.js';
import {
  GENERATION_MODEL,
  JEV_MODEL,
  createReplyPrompt,
  createTriageRequest,
  evaluateTriage,
  failedAudit,
  parseKnowledgeBase,
} from './triage.js';

const knowledgeBase = readFileSync(
  new URL('../../../knowledge-base.md', import.meta.url),
  'utf-8',
);
const knowledgeBaseSections = parseKnowledgeBase(knowledgeBase);

if (knowledgeBaseSections.length === 0) {
  throw new Error('No answer sections found in knowledge-base.md');
}

let typesafeClient: TypeSafeClient | undefined;

function getTypeSafeClient(): TypeSafeClient {
  typesafeClient ??= new TypeSafeClient({
    apiKey: process.env.TYPESAFE_API_KEY,
    defaultModel: JEV_MODEL,
    logLevel: 'warn',
  });
  return typesafeClient;
}

export interface AutoResolveDependencies {
  triage: (ticket: Ticket) => Promise<ReturnType<typeof evaluateTriage>>;
  generateReply: (
    ticket: Ticket,
    section: ReturnType<typeof parseKnowledgeBase>[number],
  ) => Promise<{
    text: string;
    usage: { promptTokens: number; completionTokens: number; totalTokens: number };
  }>;
}

const defaultDependencies: AutoResolveDependencies = {
  async triage(ticket) {
    const result = await getTypeSafeClient().systemOne(
      createTriageRequest(ticket, knowledgeBaseSections),
    );
    return evaluateTriage(result, knowledgeBaseSections);
  },
  async generateReply(ticket, section) {
    const { system, prompt } = createReplyPrompt(ticket, section);
    const { text, usage } = await generateText({
      model: openai(GENERATION_MODEL),
      system,
      prompt,
    });
    return { text, usage };
  },
};

function jsonAudit(audit: AiDecisionAudit): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(audit)) as Prisma.InputJsonValue;
}

async function routeToHuman(
  ticket: Ticket,
  audit: AiDecisionAudit,
  category: Ticket['category'],
) {
  await prisma.ticket.update({
    where: { id: ticket.id },
    data: {
      status: TicketStatus.open,
      assignedToId: null,
      category,
      aiConfidence: audit.kb?.answerProbability ?? null,
      aiKbSection: audit.kb?.sectionTitle ?? null,
      aiDecision: jsonAudit(audit),
    },
  });
}

export async function registerAutoResolveWorker(
  dependencies: AutoResolveDependencies = defaultDependencies,
) {
  const { id: aiAgentId } = await prisma.user.findUniqueOrThrow({
    where: { email: AI_AGENT_EMAIL },
    select: { id: true },
  });

  await boss.createQueue('auto-resolve');

  await boss.work<{ ticket: Ticket }>('auto-resolve', async ([job]) => {
    const { ticket } = job.data;

    const current = await prisma.ticket.findUnique({
      where: { id: ticket.id },
      select: { status: true, category: true },
    });
    if (current?.status !== TicketStatus.new) {
      logger.info({ ticketId: ticket.id }, 'auto-resolve: ticket no longer new, skipping');
      return;
    }

    await prisma.ticket.update({
      where: { id: ticket.id },
      data: { status: TicketStatus.processing, assignedToId: aiAgentId },
    });

    try {
      await triageAndRespond(ticket, current.category, aiAgentId, dependencies);
    } catch (err) {
      // The handled paths in triageAndRespond already route failures to a human. This
      // catches anything else (e.g. a failed DB write) that would otherwise strand the
      // ticket in processing — retries skip tickets that are no longer new. Scoped to
      // processing so a ticket that was already resolved is not reopened.
      await prisma.ticket.updateMany({
        where: { id: ticket.id, status: TicketStatus.processing },
        data: { status: TicketStatus.open, assignedToId: null },
      });
      logger.error({ ticketId: ticket.id, err }, 'auto-resolve: unexpected error, reverted to open');
      throw err;
    }
  });
}

/**
 * Runs triage and, when approved, reply generation for a ticket the worker has
 * already claimed. `category` is read fresh from the DB at claim time rather than
 * from the job payload, so an agent's edit made while the job was queued survives.
 */
async function triageAndRespond(
  ticket: Ticket,
  currentCategory: Ticket['category'],
  aiAgentId: string,
  dependencies: AutoResolveDependencies,
) {
  const triageStartedAt = Date.now();
  let audit: AiDecisionAudit;
  let selectedSection: ReturnType<typeof parseKnowledgeBase>[number] | null;

  try {
    ({ audit, selectedSection } = await dependencies.triage(ticket));
  } catch (err) {
    audit = failedAudit('typesafe_error');
    await routeToHuman(ticket, audit, currentCategory);
    logger.error(
      { ticketId: ticket.id, err, latencyMs: Date.now() - triageStartedAt },
      'auto-resolve: TypeSafe triage failed; routed to human',
    );
    return;
  }

  const category = currentCategory ?? audit.category!.choice;
  const logContext = {
    ticketId: ticket.id,
    model: audit.model,
    decision: audit.decision,
    reasons: audit.reasons,
    latencyMs: Date.now() - triageStartedAt,
    inputTokens: audit.usage.typesafe?.inputTokens,
    outputTokens: audit.usage.typesafe?.outputTokens,
  };

  if (audit.decision === 'human_review' || !selectedSection) {
    await routeToHuman(ticket, audit, category);
    logger.info(logContext, 'auto-resolve: TypeSafe routed ticket to human');
    return;
  }

  const generationStartedAt = Date.now();
  let replyBody: string;
  let generationUsage: { promptTokens: number; completionTokens: number; totalTokens: number };
  try {
    const { text, usage } = await dependencies.generateReply(ticket, selectedSection);
    replyBody = text.trim();
    if (!replyBody) throw new Error('OpenAI returned an empty reply');
    generationUsage = usage;
  } catch (err) {
    audit.decision = 'human_review';
    audit.reasons = [...audit.reasons, 'generation_error'];
    await routeToHuman(ticket, audit, category);
    logger.error(
      {
        ...logContext,
        decision: audit.decision,
        reasons: audit.reasons,
        err,
        generationLatencyMs: Date.now() - generationStartedAt,
      },
      'auto-resolve: reply generation failed; routed to human',
    );
    return;
  }

  audit.usage.openai = {
    model: GENERATION_MODEL,
    promptTokens: generationUsage.promptTokens,
    completionTokens: generationUsage.completionTokens,
    totalTokens: generationUsage.totalTokens,
  };

  await prisma.$transaction([
    prisma.reply.create({
      data: {
        ticketId: ticket.id,
        authorId: aiAgentId,
        body: replyBody,
        senderType: ReplySenderType.agent,
      },
    }),
    prisma.ticket.update({
      where: { id: ticket.id },
      data: {
        category,
        status: TicketStatus.resolved,
        resolvedByAi: true,
        resolvedAt: new Date(),
        aiConfidence: audit.kb!.answerProbability,
        aiKbSection: selectedSection.title,
        aiDecision: jsonAudit(audit),
      },
    }),
  ]);

  await boss.send('send-email', {
    to: ticket.fromEmail,
    subject: `Re: ${ticket.subject}`,
    text: replyBody,
  });

  logger.info(
    {
      ...logContext,
      generationLatencyMs: Date.now() - generationStartedAt,
      openaiPromptTokens: generationUsage.promptTokens,
      openaiCompletionTokens: generationUsage.completionTokens,
    },
    'auto-resolve: ticket resolved by AI',
  );
}
