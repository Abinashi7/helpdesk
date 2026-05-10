/**
 * tickets.spec.ts — End-to-end tests for the /tickets page.
 *
 * Coverage:
 *  1. Access control  — unauthenticated redirect; admin + agent can access
 *  2. Sort order      — newest ticket appears above an older ticket in the list
 *
 * Navbar link visibility, column headers, and ticket data rendering are covered
 * by component tests (Navbar.test.tsx, TicketsPage.test.tsx).
 *
 * Tickets are created via the unauthenticated webhook API (POST /api/webhooks/email).
 * There is no delete-ticket API, so created tickets are not cleaned up — each test
 * uses a unique subject / messageId so assertions target only the rows it created.
 */

import { test, expect, type APIRequestContext } from '@playwright/test';
import { ADMIN_AUTH_FILE, AGENT_AUTH_FILE } from './helpers/auth';

const BACKEND_URL = 'http://localhost:3002';
const WEBHOOK_URL = `${BACKEND_URL}/api/webhooks/email`;

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Returns a string that is unique within this test run. */
function uid(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

interface TicketPayload {
  subject?: string;
  body?: string;
  fromEmail?: string;
  fromName?: string;
  messageId?: string;
  category?: string;
}

/** Create a ticket via the inbound email webhook (no auth required). */
async function createTicket(
  request: APIRequestContext,
  overrides: TicketPayload = {},
): Promise<number> {
  const res = await request.post(WEBHOOK_URL, {
    data: {
      subject: uid('Subject'),
      body: 'Test body content',
      fromEmail: 'sender@test.example',
      fromName: 'Test Sender',
      messageId: uid('msg'),
      ...overrides,
    },
    headers: { 'Content-Type': 'application/json' },
  });
  expect(res.status()).toBe(200);
  const body = await res.json() as { ok: boolean; ticketId: number };
  return body.ticketId;
}

// ── 1. Access control ─────────────────────────────────────────────────────────

test.describe('Tickets page — access control', () => {
  test.describe('Unauthenticated user', () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test('visiting /tickets redirects to /login', async ({ page }) => {
      await page.goto('/tickets');
      await page.waitForURL('/login');
      await expect(page).toHaveURL('/login');
    });
  });

  test.describe('Authenticated admin', () => {
    test.use({ storageState: ADMIN_AUTH_FILE });

    test('admin can visit /tickets and sees the page heading', async ({ page }) => {
      await page.goto('/tickets');
      await expect(page).toHaveURL('/tickets');
      await expect(page.getByRole('heading', { name: 'Tickets' })).toBeVisible();
    });
  });

  test.describe('Authenticated agent', () => {
    test.use({ storageState: AGENT_AUTH_FILE });

    test('agent can visit /tickets and sees the page heading', async ({ page }) => {
      await page.goto('/tickets');
      await expect(page).toHaveURL('/tickets');
      await expect(page.getByRole('heading', { name: 'Tickets' })).toBeVisible();
    });
  });
});

// ── 2. Sort order ─────────────────────────────────────────────────────────────

test.describe('Tickets page — table', () => {
  test.use({ storageState: ADMIN_AUTH_FILE });

  // ── Sort order — newest first ──────────────────────────────────────────────

  test('clicking Subject header twice sorts tickets by subject descending', async ({ page, request }) => {
    // Use a shared prefix so we can filter to exactly these two tickets via
    // the search box — this prevents the AAA ticket from being pushed off
    // page 1 by unrelated tickets accumulated from other test runs.
    const prefix = uid('SORTTEST');
    const subjectA = `${prefix}-AAA`;
    const subjectZ = `${prefix}-ZZZ`;

    await createTicket(request, { subject: subjectZ });
    await createTicket(request, { subject: subjectA });

    await page.goto('/tickets');

    // Each network call triggers a re-fetch; always wait for the response
    // before the next interaction to avoid racing against in-flight requests.
    const waitForTickets = () =>
      page.waitForResponse((r) => r.url().includes('/api/tickets') && r.status() === 200);

    // Filter to just our two tickets
    await page.getByPlaceholder(/search tickets/i).fill(prefix);
    await waitForTickets(); // debounced search resolves

    await expect(page.getByRole('cell', { name: subjectA })).toBeVisible();
    await expect(page.getByRole('cell', { name: subjectZ })).toBeVisible();

    await page.getByRole('columnheader', { name: /subject/i }).click();
    await waitForTickets(); // asc sort applied

    await page.getByRole('columnheader', { name: /subject/i }).click();
    await waitForTickets(); // desc sort applied

    const zRow = page.getByRole('row').filter({ hasText: subjectZ });
    const aRow = page.getByRole('row').filter({ hasText: subjectA });
    await expect(zRow).toBeVisible();
    await expect(aRow).toBeVisible();

    const zBox = await zRow.boundingBox();
    const aBox = await aRow.boundingBox();

    expect(zBox).not.toBeNull();
    expect(aBox).not.toBeNull();
    expect(zBox!.y).toBeLessThan(aBox!.y); // Z sorts above A in desc order
  });

  test('tickets are ordered newest first', async ({ page, request }) => {
    const olderSubject = uid('Older');
    const newerSubject = uid('Newer');

    // Create older ticket first, then newer ticket
    await createTicket(request, { subject: olderSubject });
    await createTicket(request, { subject: newerSubject });

    await page.goto('/tickets');

    // Both must be present
    await expect(page.getByRole('cell', { name: newerSubject })).toBeVisible();
    await expect(page.getByRole('cell', { name: olderSubject })).toBeVisible();

    // Newer ticket's row must appear above the older one (smaller Y coordinate)
    const newerRow = page.getByRole('row').filter({ hasText: newerSubject });
    const olderRow = page.getByRole('row').filter({ hasText: olderSubject });

    const newerBox = await newerRow.boundingBox();
    const olderBox = await olderRow.boundingBox();

    expect(newerBox).not.toBeNull();
    expect(olderBox).not.toBeNull();
    expect(newerBox!.y).toBeLessThan(olderBox!.y);
  });
});
