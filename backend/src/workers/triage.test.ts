import { describe, expect, it } from 'vitest';
import {
  JEV_MODEL,
  createReplyPrompt,
  evaluateTriage,
  parseKnowledgeBase,
  type KnowledgeBaseSection,
  type TriageResult,
} from './triage.js';

const sections: KnowledgeBaseSection[] = [
  { id: 'section_1', title: '1. Account & Login Issues', content: 'Reset instructions' },
  { id: 'section_4', title: '4. Refund Policy', content: 'Refund policy' },
];

function result(overrides: Record<string, number | string> = {}): TriageResult {
  const selected = String(overrides.kbSection ?? 'section_1');
  return {
    model: JEV_MODEL,
    usage: { input_tokens: 1200, output_tokens: 20 },
    answers: {
      category: {
        type: 'choice',
        choice: String(overrides.category ?? 'account'),
        confidence: Number(overrides.categoryConfidence ?? 0.9),
        probabilities: { billing: 0.02, technical: 0.03, account: 0.9, general: 0.05 },
      },
      kbSection: {
        type: 'choice',
        choice: selected,
        confidence: Number(overrides.sectionConfidence ?? 0.8),
        probabilities: { section_1: selected === 'section_1' ? 0.9 : 0.05, section_4: 0.05, none: selected === 'none' ? 0.9 : 0.05 },
      },
      genuineSupport: { type: 'noul', noul: Number(overrides.genuineSupport ?? 0.8) },
      completeKbAnswer: { type: 'noul', noul: Number(overrides.completeKbAnswer ?? 0.75) },
      legalThreat: { type: 'noul', noul: Number(overrides.legalThreat ?? 0.19) },
      chargebackOrDispute: { type: 'noul', noul: Number(overrides.chargebackOrDispute ?? 0.19) },
      accountSecurity: { type: 'noul', noul: Number(overrides.accountSecurity ?? 0.19) },
      refundRequiresHuman: { type: 'noul', noul: Number(overrides.refundRequiresHuman ?? 0.19) },
    },
  } as TriageResult;
}

describe('parseKnowledgeBase', () => {
  it('returns level-two answer sections and excludes internal escalation policy', () => {
    const parsed = parseKnowledgeBase(`# KB\n\n## 1. Login\nAnswer\n\n### Detail\nMore\n\n## 2. Billing\nAnswer\n\n## 10. Escalation Rules (Internal Policy)\nNever auto answer`);

    expect(parsed).toEqual([
      { id: 'section_1', title: '1. Login', content: '## 1. Login\nAnswer\n\n### Detail\nMore' },
      { id: 'section_2', title: '2. Billing', content: '## 2. Billing\nAnswer' },
    ]);
  });
});

describe('createReplyPrompt', () => {
  it('sends only the selected section to the generation model', () => {
    const messages = createReplyPrompt(
      {
        subject: 'Password reset',
        body: 'How do I reset it?',
        fromName: 'Jane Customer',
        fromEmail: 'jane@example.com',
      },
      sections[0]!,
    );

    expect(messages.prompt).toContain('Reset instructions');
    expect(messages.prompt).not.toContain('Refund policy');
    expect(messages.system).toContain('Hi Jane,');
  });
});

describe('evaluateTriage', () => {
  it('auto-resolves exactly at every safe boundary', () => {
    const evaluated = evaluateTriage(result(), sections);
    expect(evaluated.audit.decision).toBe('auto_resolve');
    expect(evaluated.audit.reasons).toEqual([]);
    expect(evaluated.selectedSection?.id).toBe('section_1');
    expect(evaluated.audit.usage.typesafe).toEqual({ inputTokens: 1200, outputTokens: 20 });
  });

  it.each([
    ['genuineSupport', 0.799, 'not_genuine_support_request'],
    ['completeKbAnswer', 0.749, 'kb_not_complete'],
    ['sectionConfidence', 0.799, 'kb_section_uncertain'],
    ['legalThreat', 0.2, 'legal_threat'],
    ['chargebackOrDispute', 0.2, 'chargeback_or_dispute'],
    ['accountSecurity', 0.2, 'account_security'],
    ['refundRequiresHuman', 0.2, 'refund_requires_human'],
  ])('routes to a human when %s is %s', (field, value, reason) => {
    const evaluated = evaluateTriage(result({ [field]: value }), sections);
    expect(evaluated.audit.decision).toBe('human_review');
    expect(evaluated.audit.reasons).toContain(reason);
  });

  it('routes to a human when no KB section matches', () => {
    const evaluated = evaluateTriage(result({ kbSection: 'none' }), sections);
    expect(evaluated.selectedSection).toBeNull();
    expect(evaluated.audit.reasons).toContain('kb_section_uncertain');
  });

  it('rejects malformed probabilities instead of making an unsafe decision', () => {
    expect(() => evaluateTriage(result({ legalThreat: 1.2 }), sections)).toThrow(
      'Invalid TypeSafe probability',
    );
  });
});
