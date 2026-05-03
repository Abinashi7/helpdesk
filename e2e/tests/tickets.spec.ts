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
