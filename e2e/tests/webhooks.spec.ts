/**
 * webhooks.spec.ts — End-to-end tests for the inbound email webhook.
 *
 * Endpoint: POST /api/webhooks/email?token=<WEBHOOK_SECRET>
 *
 * Coverage:
 *  1. Create        — valid payload returns { ok: true, ticketId: <number> }
 *  2. Idempotency   — same messageId twice returns the same ticketId
 *  3. No messageId  — two identical requests without messageId create two tickets
 *  4. With category — valid category value is accepted
 *  5. Invalid category — unrecognised category returns 400
 *  6. Missing required field (fromName) — returns 400
 *  7. Missing body field — returns 400
 *  8. Auth (conditional) — if WEBHOOK_SECRET is set: wrong token → 401, correct token → 200
 *
 * Notes:
 *  - This is a pure API endpoint; no browser / page fixture is used.
 *  - WEBHOOK_SECRET is not set in .env.test, so auth cases are skipped unless
 *    the env var is present at runtime.
 *  - Created tickets are not cleaned up — the test DB is reset between CI runs,
 *    and there is no public delete-ticket route.
 */

import { test, expect } from '@playwright/test';

const BACKEND_URL = 'http://localhost:3002';
const WEBHOOK_URL = `${BACKEND_URL}/api/webhooks/email`;

/** The secret value used when WEBHOOK_SECRET is set (read from the process env
 *  that Playwright inherits from the shell / .env.test).  Empty string means
 *  the var was not set, and auth tests will be skipped. */
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET ?? '';

/** Build the full URL with an optional token query parameter. */
function webhookUrl(token?: string): string {
  return token ? `${WEBHOOK_URL}?token=${token}` : WEBHOOK_URL;
}

/** A minimal valid payload that every test can start from. */
function validPayload(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    subject: 'Test subject',
    body: 'Test body content',
    fromEmail: 'sender@example.com',
    fromName: 'Test Sender',
    ...overrides,
  };
}

test.describe('Webhook — POST /api/webhooks/email', () => {

  // ── 1. Create — happy path ─────────────────────────────────────────────────

  test('valid payload returns ok: true and a numeric ticketId', async ({ request }) => {
    const res = await request.post(webhookUrl(), {
      data: validPayload(),
      headers: { 'Content-Type': 'application/json' },
    });

    expect(res.status()).toBe(200);

    const body = await res.json() as { ok: boolean; ticketId: unknown };
    expect(body.ok).toBe(true);
    expect(typeof body.ticketId).toBe('number');
  });

  // ── 2. Idempotency — same messageId returns the same ticketId ──────────────

  test('same messageId sent twice returns the same ticketId', async ({ request }) => {
    // Use a timestamp-based messageId to avoid collisions across test runs.
    const messageId = `idempotency-test-${Date.now()}`;

    const first = await request.post(webhookUrl(), {
      data: validPayload({ messageId }),
      headers: { 'Content-Type': 'application/json' },
    });
    expect(first.status()).toBe(200);
    const firstBody = await first.json() as { ok: boolean; ticketId: number };
    expect(firstBody.ok).toBe(true);

    const second = await request.post(webhookUrl(), {
      data: validPayload({ messageId }),
      headers: { 'Content-Type': 'application/json' },
    });
    expect(second.status()).toBe(200);
    const secondBody = await second.json() as { ok: boolean; ticketId: number };
    expect(secondBody.ok).toBe(true);

    // Both responses must reference the same ticket — no duplicate was created.
    expect(secondBody.ticketId).toBe(firstBody.ticketId);
  });

  // ── 3. No messageId — two requests create two distinct tickets ─────────────

  test('two identical requests without messageId produce different ticketIds', async ({ request }) => {
    const payload = validPayload();

    const first = await request.post(webhookUrl(), {
      data: payload,
      headers: { 'Content-Type': 'application/json' },
    });
    expect(first.status()).toBe(200);
    const firstBody = await first.json() as { ok: boolean; ticketId: number };

    const second = await request.post(webhookUrl(), {
      data: payload,
      headers: { 'Content-Type': 'application/json' },
    });
    expect(second.status()).toBe(200);
    const secondBody = await second.json() as { ok: boolean; ticketId: number };

    // Without a messageId there is no deduplication key — two tickets must be created.
    expect(secondBody.ticketId).not.toBe(firstBody.ticketId);
  });

  // ── 4. With category — all valid enum values are accepted ──────────────────

  for (const category of ['billing', 'technical', 'account', 'general'] as const) {
    test(`category "${category}" is accepted`, async ({ request }) => {
      const res = await request.post(webhookUrl(), {
        data: validPayload({ category }),
        headers: { 'Content-Type': 'application/json' },
      });

      expect(res.status()).toBe(200);
      const body = await res.json() as { ok: boolean; ticketId: number };
      expect(body.ok).toBe(true);
      expect(typeof body.ticketId).toBe('number');
    });
  }

  // ── 5. Invalid category — returns 400 ─────────────────────────────────────

  test('invalid category returns 400 with an error message', async ({ request }) => {
    const res = await request.post(webhookUrl(), {
      data: validPayload({ category: 'invalid' }),
      headers: { 'Content-Type': 'application/json' },
    });

    expect(res.status()).toBe(400);

    const body = await res.json() as { error: unknown };
    // The error message should be a non-empty string describing the validation failure.
    expect(typeof body.error).toBe('string');
    expect((body.error as string).length).toBeGreaterThan(0);
  });

  // ── 6. Missing required field — fromName ───────────────────────────────────

  test('missing fromName returns 400', async ({ request }) => {
    const { fromName: _omitted, ...payloadWithoutFromName } = validPayload() as {
      fromName: string;
      [key: string]: unknown;
    };

    const res = await request.post(webhookUrl(), {
      data: payloadWithoutFromName,
      headers: { 'Content-Type': 'application/json' },
    });

    expect(res.status()).toBe(400);

    const body = await res.json() as { error: unknown };
    expect(typeof body.error).toBe('string');
  });

  // ── 7. Missing body field ──────────────────────────────────────────────────

  test('missing body field returns 400', async ({ request }) => {
    const { body: _omitted, ...payloadWithoutBody } = validPayload() as {
      body: string;
      [key: string]: unknown;
    };

    const res = await request.post(webhookUrl(), {
      data: payloadWithoutBody,
      headers: { 'Content-Type': 'application/json' },
    });

    expect(res.status()).toBe(400);

    const body = await res.json() as { error: unknown };
    expect(typeof body.error).toBe('string');
  });

  // ── 8. Auth (conditional on WEBHOOK_SECRET being set) ─────────────────────

  test.describe('Auth — token verification', () => {
    test('wrong token returns 401', async ({ request }) => {
      test.skip(!WEBHOOK_SECRET, 'WEBHOOK_SECRET not set in .env.test — skipping auth tests');

      const res = await request.post(webhookUrl('wrong-token'), {
        data: validPayload(),
        headers: { 'Content-Type': 'application/json' },
      });

      expect(res.status()).toBe(401);

      const body = await res.json() as { error: unknown };
      expect(body.error).toBe('Unauthorized');
    });

    test('missing token returns 401', async ({ request }) => {
      test.skip(!WEBHOOK_SECRET, 'WEBHOOK_SECRET not set in .env.test — skipping auth tests');

      // POST with no token query param at all.
      const res = await request.post(WEBHOOK_URL, {
        data: validPayload(),
        headers: { 'Content-Type': 'application/json' },
      });

      expect(res.status()).toBe(401);

      const body = await res.json() as { error: unknown };
      expect(body.error).toBe('Unauthorized');
    });

    test('correct token returns 200', async ({ request }) => {
      test.skip(!WEBHOOK_SECRET, 'WEBHOOK_SECRET not set in .env.test — skipping auth tests');

      const res = await request.post(webhookUrl(WEBHOOK_SECRET), {
        data: validPayload(),
        headers: { 'Content-Type': 'application/json' },
      });

      expect(res.status()).toBe(200);

      const body = await res.json() as { ok: boolean; ticketId: number };
      expect(body.ok).toBe(true);
    });
  });
});
