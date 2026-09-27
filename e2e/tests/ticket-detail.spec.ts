/**
 * ticket-detail.spec.ts — End-to-end tests for the /tickets/:id page.
 *
 * Coverage (full-stack only — rendering, form state, and mocked-API behaviour
 * are covered by TicketDetailPage / TicketDetail / ReplyThread / ReplyCompose
 * component tests):
 *  1. Access control  — unauthenticated redirect; admin + agent can both access
 *  2. Navigation      — clicking the subject link on /tickets reaches the detail page
 *  3. Mutations       — status, category, and assignment changes persist to DB
 *                       (verified by page reload, confirming the round-trip)
 *  4. Replies         — reply submission persists; multiple replies appear in
 *                       chronological order from the DB
 *
 * Tickets are created via the unauthenticated webhook API. There is no delete
 * endpoint so created tickets are never cleaned up — each test uses a unique
 * subject/messageId so assertions target only the data it created.
 */

import { test, expect, type APIRequestContext } from '@playwright/test';
import { ADMIN_AUTH_FILE, AGENT_AUTH_FILE } from './helpers/auth';

const BACKEND_URL = 'http://localhost:3002';
const WEBHOOK_URL = `${BACKEND_URL}/api/webhooks/email`;

// ── Helpers ───────────────────────────────────────────────────────────────────

function uid(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

interface TicketPayload {
  subject?: string;
  body?: string;
  fromEmail?: string;
  fromName?: string;
  messageId?: string;
}

async function createTicket(
  request: APIRequestContext,
  overrides: TicketPayload = {},
): Promise<number> {
  const {
    subject = uid('Subject'),
    body = 'Test body content',
    fromEmail = 'sender@test.example',
    fromName = 'Test Sender',
    messageId = uid('msg'),
  } = overrides;
  // Mailgun inbound-route shape: form-encoded, Message-Id inside message-headers.
  const res = await request.post(WEBHOOK_URL, {
    form: {
      from: `${fromName} <${fromEmail}>`,
      subject,
      'stripped-text': body,
      'message-headers': JSON.stringify([['Message-Id', `<${messageId}>`]]),
    },
  });
  expect(res.status()).toBe(200);
  const json = await res.json() as { ok: boolean; ticketId: number };
  return json.ticketId;
}

// The sidebar renders three <select> elements in this order: Status, Category, Assigned To
function statusSelect(page: import('@playwright/test').Page) {
  return page.getByRole('combobox').nth(0);
}
function categorySelect(page: import('@playwright/test').Page) {
  return page.getByRole('combobox').nth(1);
}
function assignSelect(page: import('@playwright/test').Page) {
  return page.getByRole('combobox').nth(2);
}

// ── 1. Access control ─────────────────────────────────────────────────────────

test.describe('Ticket detail — access control', () => {
  test.describe('Unauthenticated user', () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test('visiting /tickets/:id redirects to /login', async ({ page }) => {
      await page.goto('/tickets/1');
      await page.waitForURL('/login');
      await expect(page).toHaveURL('/login');
    });
  });

  test.describe('Authenticated admin', () => {
    test.use({ storageState: ADMIN_AUTH_FILE });

    test('admin can view the ticket detail page', async ({ page, request }) => {
      const id = await createTicket(request);
      await page.goto(`/tickets/${id}`);
      await expect(page).toHaveURL(`/tickets/${id}`);
      await expect(page.getByRole('link', { name: /back to tickets/i })).toBeVisible();
    });
  });

  test.describe('Authenticated agent', () => {
    test.use({ storageState: AGENT_AUTH_FILE });

    test('agent can view the ticket detail page', async ({ page, request }) => {
      const id = await createTicket(request);
      await page.goto(`/tickets/${id}`);
      await expect(page).toHaveURL(`/tickets/${id}`);
      await expect(page.getByRole('link', { name: /back to tickets/i })).toBeVisible();
    });
  });
});

// ── 2. Navigation — cross-page flow ───────────────────────────────────────────

test.describe('Ticket detail — navigation', () => {
  test.use({ storageState: ADMIN_AUTH_FILE });

  test('clicking the subject link on /tickets navigates to the detail page', async ({ page, request }) => {
    const subject = uid('NavSubject');
    const id = await createTicket(request, { subject });

    await page.goto('/tickets');
    await expect(page.getByRole('cell', { name: subject })).toBeVisible();

    await page.getByRole('link', { name: subject }).click();
    await page.waitForURL(`/tickets/${id}`);
    await expect(page.getByRole('heading', { name: subject })).toBeVisible();
  });
});

// ── 3. Mutations — DB persistence verified by reload ─────────────────────────

test.describe('Ticket detail — mutations', () => {
  test.use({ storageState: ADMIN_AUTH_FILE });

  test('status change persists to DB', async ({ page, request }) => {
    const id = await createTicket(request);
    await page.goto(`/tickets/${id}`);

    await statusSelect(page).selectOption('pending');

    await page.reload();
    await expect(statusSelect(page)).toHaveValue('pending');
  });

  test('category change persists to DB', async ({ page, request }) => {
    const id = await createTicket(request);
    await page.goto(`/tickets/${id}`);

    await categorySelect(page).selectOption('billing');

    await page.reload();
    await expect(categorySelect(page)).toHaveValue('billing');
  });

  test('agent assignment persists to DB', async ({ page, request }) => {
    const id = await createTicket(request);
    await page.goto(`/tickets/${id}`);

    // The seeded test agent has name "Agent"
    await assignSelect(page).selectOption({ label: 'Agent' });

    await page.reload();
    // assignedTo.id is set (non-empty) — confirms the assignment reached the DB
    await expect(assignSelect(page)).not.toHaveValue('');
  });
});

// ── 4. Replies — DB persistence and ordering ──────────────────────────────────

test.describe('Ticket detail — replies', () => {
  test.use({ storageState: ADMIN_AUTH_FILE });

  test('submitted reply persists after page reload', async ({ page, request }) => {
    const id = await createTicket(request);
    await page.goto(`/tickets/${id}`);

    await page.getByRole('textbox', { name: /reply body/i }).fill('Persisted reply text.');
    await page.getByRole('button', { name: /send reply/i }).click();
    await expect(page.getByText('Persisted reply text.')).toBeVisible();

    await page.reload();
    await expect(page.getByText('Persisted reply text.')).toBeVisible();
  });

  test('multiple replies appear in DB chronological order', async ({ page, request }) => {
    const id = await createTicket(request);
    await page.goto(`/tickets/${id}`);

    // Post first reply and wait for it to appear before posting the second
    await page.getByRole('textbox', { name: /reply body/i }).fill('Reply Alpha first');
    await page.getByRole('button', { name: /send reply/i }).click();
    await expect(page.getByText('Reply Alpha first')).toBeVisible();

    await page.getByRole('textbox', { name: /reply body/i }).fill('Reply Beta second');
    await page.getByRole('button', { name: /send reply/i }).click();
    await expect(page.getByText('Reply Beta second')).toBeVisible();

    // Reload to get the DB-ordered reply list
    await page.reload();
    await expect(page.getByText('Reply Alpha first')).toBeVisible();
    await expect(page.getByText('Reply Beta second')).toBeVisible();

    const alphaBox = await page.getByText('Reply Alpha first').boundingBox();
    const betaBox = await page.getByText('Reply Beta second').boundingBox();

    expect(alphaBox).not.toBeNull();
    expect(betaBox).not.toBeNull();
    expect(alphaBox!.y).toBeLessThan(betaBox!.y);
  });
});
