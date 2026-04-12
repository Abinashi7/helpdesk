/**
 * Auth setup — runs once before all test projects (via the "setup" project
 * in playwright.config.ts).  Logs each test user in by posting directly to
 * the better-auth API so no browser is required, then persists the resulting
 * cookies to .auth/admin.json and .auth/agent.json.  Individual test files
 * opt in to a pre-authenticated state with:
 *
 *   test.use({ storageState: ADMIN_AUTH_FILE });
 */

import { test as setup, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { ADMIN_AUTH_FILE, AGENT_AUTH_FILE } from './helpers/auth';

const BACKEND_URL = 'http://localhost:3002';

/** POST to the better-auth sign-in endpoint and return the Set-Cookie header. */
async function fetchSessionCookie(
  request: import('@playwright/test').APIRequestContext,
  email: string,
  password: string,
): Promise<void> {
  const res = await request.post(`${BACKEND_URL}/api/auth/sign-in/email`, {
    data: { email, password },
    headers: { 'Content-Type': 'application/json' },
  });

  expect(res.status(), `sign-in for ${email} should return 200`).toBe(200);
}

// ── Admin ────────────────────────────────────────────────────────────────────

setup('authenticate as admin', async ({ request }) => {
  // Ensure the .auth directory exists
  fs.mkdirSync(path.dirname(ADMIN_AUTH_FILE), { recursive: true });

  await fetchSessionCookie(request, 'admin@example.com', 'password123');

  // The APIRequestContext accumulates cookies; save them so browser contexts
  // can reuse the session without going through the login UI.
  await request.storageState({ path: ADMIN_AUTH_FILE });
});

// ── Agent ────────────────────────────────────────────────────────────────────

setup('authenticate as agent', async ({ request }) => {
  fs.mkdirSync(path.dirname(AGENT_AUTH_FILE), { recursive: true });

  await fetchSessionCookie(request, 'agent@example.com', 'password123');

  await request.storageState({ path: AGENT_AUTH_FILE });
});
