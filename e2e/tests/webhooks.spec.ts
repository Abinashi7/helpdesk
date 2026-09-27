/** End-to-end coverage for the Mailgun-compatible inbound email webhook. */
import { test, expect } from '@playwright/test';

const BACKEND_URL = 'http://localhost:3002';
const WEBHOOK_URL = `${BACKEND_URL}/api/webhooks/email`;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET ?? '';

function webhookUrl(token?: string): string {
  return token ? `${WEBHOOK_URL}?token=${token}` : WEBHOOK_URL;
}

function validPayload(overrides: Record<string, string> = {}): Record<string, string> {
  const { messageId, ...fields } = overrides;
  return {
    from: 'Test Sender <sender@example.com>',
    subject: 'Test subject',
    'stripped-text': 'Test body content',
    ...(messageId && { 'message-headers': JSON.stringify([['Message-Id', `<${messageId}>`]]) }),
    ...fields,
  };
}

test.describe('Webhook — POST /api/webhooks/email', () => {
  test('valid Mailgun form payload returns a ticket id', async ({ request }) => {
    const res = await request.post(webhookUrl(), { form: validPayload() });

    expect(res.status()).toBe(200);
    const body = await res.json() as { ok: boolean; ticketId: unknown };
    expect(body.ok).toBe(true);
    expect(typeof body.ticketId).toBe('number');
  });

  test('same Message-Id returns the same ticket', async ({ request }) => {
    const messageId = `idempotency-test-${Date.now()}`;
    const first = await request.post(webhookUrl(), { form: validPayload({ messageId }) });
    const second = await request.post(webhookUrl(), { form: validPayload({ messageId }) });

    expect(first.status()).toBe(200);
    expect(second.status()).toBe(200);
    const firstBody = await first.json() as { ticketId: number };
    const secondBody = await second.json() as { ticketId: number };
    expect(secondBody.ticketId).toBe(firstBody.ticketId);
  });

  test('requests without Message-Id create different tickets', async ({ request }) => {
    const first = await request.post(webhookUrl(), { form: validPayload() });
    const second = await request.post(webhookUrl(), { form: validPayload() });

    expect(first.status()).toBe(200);
    expect(second.status()).toBe(200);
    const firstBody = await first.json() as { ticketId: number };
    const secondBody = await second.json() as { ticketId: number };
    expect(secondBody.ticketId).not.toBe(firstBody.ticketId);
  });

  for (const bodyField of ['body-plain', 'body-html'] as const) {
    test(`${bodyField} is accepted when stripped-text is absent`, async ({ request }) => {
      const { 'stripped-text': _omitted, ...payload } = validPayload();
      const res = await request.post(webhookUrl(), {
        form: { ...payload, [bodyField]: 'Fallback body content' },
      });

      expect(res.status()).toBe(200);
      expect((await res.json() as { ok: boolean }).ok).toBe(true);
    });
  }

  test('missing from returns 400', async ({ request }) => {
    const { from: _omitted, ...payload } = validPayload();
    const res = await request.post(webhookUrl(), { form: payload });
    expect(res.status()).toBe(400);
  });

  test('missing body returns 400', async ({ request }) => {
    const { 'stripped-text': _omitted, ...payload } = validPayload();
    const res = await request.post(webhookUrl(), { form: payload });
    expect(res.status()).toBe(400);
  });

  test.describe('Auth — token verification', () => {
    test('wrong token returns 401', async ({ request }) => {
      test.skip(!WEBHOOK_SECRET, 'WEBHOOK_SECRET not set in .env.test');
      const res = await request.post(webhookUrl('wrong-token'), { form: validPayload() });
      expect(res.status()).toBe(401);
      expect((await res.json() as { error: string }).error).toBe('Unauthorized');
    });

    test('missing token returns 401', async ({ request }) => {
      test.skip(!WEBHOOK_SECRET, 'WEBHOOK_SECRET not set in .env.test');
      const res = await request.post(WEBHOOK_URL, { form: validPayload() });
      expect(res.status()).toBe(401);
    });

    test('correct token returns 200', async ({ request }) => {
      test.skip(!WEBHOOK_SECRET, 'WEBHOOK_SECRET not set in .env.test');
      const res = await request.post(webhookUrl(WEBHOOK_SECRET), { form: validPayload() });
      expect(res.status()).toBe(200);
    });
  });
});
