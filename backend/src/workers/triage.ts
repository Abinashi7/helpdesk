import { choice, noul, type SystemOneResult } from '@typesafe-ai/sdk';
import {
  TicketCategory,
  type AiDecisionAudit,
  type AiDecisionReason,
} from '@helpdesk/core';

export const JEV_MODEL = 'jev-1.13.0';
export const GENERATION_MODEL = 'gpt-5-nano' as const;

export const TRIAGE_THRESHOLDS = {
  genuineSupport: 0.8,
  // Tuned on 26 labelled emails and validated on a separate 30: 0.90 sent most
  // answerable questions (which score 0.77–0.88) to humans; 0.75 lifted held-out
  // routing accuracy from 60% to 85% with no unsafe auto-answers. Every risky email
  // was still blocked by an escalation signal or scored at most 0.64 here.
  completeAnswer: 0.75,
  sectionConfidence: 0.8,
  escalation: 0.2,
} as const;

export interface KnowledgeBaseSection {
  id: string;
  title: string;
  content: string;
}

export function createReplyPrompt(
  ticket: { subject: string; body: string; fromName: string; fromEmail: string },
  section: KnowledgeBaseSection,
): { system: string; prompt: string } {
  const customerFirstName = ticket.fromName.trim().split(/\s+/)[0] || 'there';
  return {
    system: `You are a customer support agent for Northwind Academy. Write a complete, professional email reply using ONLY the supplied knowledge-base section. Do not add facts, promises, or steps that are absent from it. Start with "Hi ${customerFirstName}," and close with "Best regards,\nNorthwind Academy Support".`,
    prompt: `KNOWLEDGE-BASE SECTION:\n${section.content}\n\nCUSTOMER EMAIL:\nSubject: ${ticket.subject}\nFrom: ${ticket.fromName} (${ticket.fromEmail})\n\n${ticket.body}`,
  };
}

export function parseKnowledgeBase(markdown: string): KnowledgeBaseSection[] {
  const headings = [...markdown.matchAll(/^##\s+(.+)$/gm)];
  return headings
    .map((heading, index) => {
      const title = heading[1]!.trim();
      const start = heading.index!;
      const end = headings[index + 1]?.index ?? markdown.length;
      const number = title.match(/^(\d+)\./)?.[1] ?? String(index + 1);
      return {
        id: `section_${number}`,
        title,
        content: markdown.slice(start, end).trim(),
      };
    })
    .filter((section) => !/escalation rules/i.test(section.title));
}

export const CATEGORY_CRITERIA = {
  billing: 'Payments, charges, refunds, coupons, or purchase billing',
  technical: 'Product behavior, playback, downloads, errors, or troubleshooting',
  account: 'Login, password, identity, access, or account changes',
  general: 'A support request that does not fit billing, technical, or account',
} as const;

export function createTriageRequest(
  ticket: { subject: string; body: string },
  sections: KnowledgeBaseSection[],
) {
  const answerSections = Object.fromEntries(
    sections.map(({ id, title, content }) => [id, { title, content }]),
  );
  const sectionCriteria = Object.fromEntries([
    ...sections.map(({ id, title }) => [id, `The direct, complete answer is in ${title}`]),
    ['none', 'No single answer section directly and completely answers every customer question'],
  ]);

  const questions = {
    category: choice('What is the primary support category of `ticket`?', CATEGORY_CRITERIA),
    kbSection: choice(
      'Which one entry in `answerSections` directly and completely answers every question in `ticket`? Choose none unless one section is sufficient by itself.',
      sectionCriteria,
    ),
    genuineSupport: noul('Is `ticket` a genuine customer support question or request that calls for a substantive answer?', {
      true: 'A real support question or request',
      false: 'A test, gibberish, greeting without a question, spam, or non-support message',
    }),
    completeKbAnswer: noul(
      'Does one section in `answerSections` directly and completely answer every customer question in `ticket`, without outside facts, account access, or unsupported assumptions?',
    ),
    legalThreat: noul('Does the customer threaten, announce, or seriously contemplate legal action?'),
    chargebackOrDispute: noul('Does the customer dispute a charge or mention initiating or considering a chargeback?'),
    accountSecurity: noul('Does the ticket involve suspected compromise, unauthorized access, fraud, exposed credentials, or another account-security concern?'),
    // Worded so tickets with no refund at all are a clear false — asking whether "the
    // refund topic" needs a human presupposes one and left unrelated tickets near 0.2.
    refundRequiresHuman: noul('Does `ticket` contain a refund request that requires human handling?', {
      true: 'The customer asks support to issue, approve, assess, dispute, or make an exception for a refund; timing or eligibility is unclear; or the request is outside policy',
      false: 'The ticket does not involve a refund at all, or the customer asks only a general informational question about the published refund policy or process',
    }),
  } as const;

  return {
    model: JEV_MODEL,
    state: {
      ticket: { subject: ticket.subject, body: ticket.body },
      answerSections,
      escalationPolicy: {
        legalThreats: 'Always require human review',
        chargebacksAndDisputedCharges: 'Always require human review',
        accountSecurity: 'Always require human review',
        refunds: 'Actionable, unclear, exceptional, or out-of-window refund requests require human review; purely informational policy questions may be answered',
      },
    },
    questions,
  };
}

export type TriageResult = SystemOneResult<ReturnType<typeof createTriageRequest>['questions']>;

function probability(value: number, name: string): number {
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new Error(`Invalid TypeSafe probability for ${name}`);
  }
  return value;
}

export function evaluateTriage(
  result: TriageResult,
  sections: KnowledgeBaseSection[],
): { audit: AiDecisionAudit; selectedSection: KnowledgeBaseSection | null } {
  const { answers } = result;
  const category = answers.category.choice as TicketCategory;
  if (!Object.values(TicketCategory).includes(category)) {
    throw new Error(`Invalid TypeSafe category: ${answers.category.choice}`);
  }

  const sectionId = answers.kbSection.choice;
  const selectedSection = sections.find((section) => section.id === sectionId) ?? null;
  if (sectionId !== 'none' && !selectedSection) {
    throw new Error(`Invalid TypeSafe knowledge-base section: ${sectionId}`);
  }

  const genuineSupport = probability(answers.genuineSupport.noul, 'genuineSupport');
  const answerProbability = probability(answers.completeKbAnswer.noul, 'completeKbAnswer');
  const legalThreat = probability(answers.legalThreat.noul, 'legalThreat');
  const chargebackOrDispute = probability(answers.chargebackOrDispute.noul, 'chargebackOrDispute');
  const accountSecurity = probability(answers.accountSecurity.noul, 'accountSecurity');
  const refundRequiresHuman = probability(answers.refundRequiresHuman.noul, 'refundRequiresHuman');
  const sectionConfidence = probability(answers.kbSection.confidence, 'kbSection.confidence');
  probability(answers.category.confidence, 'category.confidence');

  const reasons: AiDecisionReason[] = [];
  if (genuineSupport < TRIAGE_THRESHOLDS.genuineSupport) reasons.push('not_genuine_support_request');
  if (legalThreat >= TRIAGE_THRESHOLDS.escalation) reasons.push('legal_threat');
  if (chargebackOrDispute >= TRIAGE_THRESHOLDS.escalation) reasons.push('chargeback_or_dispute');
  if (accountSecurity >= TRIAGE_THRESHOLDS.escalation) reasons.push('account_security');
  if (refundRequiresHuman >= TRIAGE_THRESHOLDS.escalation) reasons.push('refund_requires_human');
  if (answerProbability < TRIAGE_THRESHOLDS.completeAnswer) reasons.push('kb_not_complete');
  if (!selectedSection || sectionConfidence < TRIAGE_THRESHOLDS.sectionConfidence) {
    reasons.push('kb_section_uncertain');
  }

  const audit: AiDecisionAudit = {
    schemaVersion: 1,
    provider: 'typesafe',
    model: result.model,
    decision: reasons.length === 0 ? 'auto_resolve' : 'human_review',
    reasons,
    category: {
      choice: category,
      confidence: answers.category.confidence,
      probabilities: { ...answers.category.probabilities },
    },
    kb: {
      answerProbability,
      sectionId: selectedSection?.id ?? null,
      sectionTitle: selectedSection?.title ?? null,
      sectionConfidence,
      sectionProbabilities: { ...answers.kbSection.probabilities },
    },
    escalation: {
      genuineSupport,
      legalThreat,
      chargebackOrDispute,
      accountSecurity,
      refundRequiresHuman,
    },
    usage: {
      typesafe: {
        inputTokens: result.usage.input_tokens,
        outputTokens: result.usage.output_tokens,
      },
      openai: null,
    },
  };

  return { audit, selectedSection };
}

export function failedAudit(reason: 'typesafe_error' | 'generation_error'): AiDecisionAudit {
  return {
    schemaVersion: 1,
    provider: 'typesafe',
    model: JEV_MODEL,
    decision: 'human_review',
    reasons: [reason],
    category: null,
    kb: null,
    escalation: null,
    usage: { typesafe: null, openai: null },
  };
}
