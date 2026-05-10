/**
 * auth.spec.ts — End-to-end tests for the helpdesk authentication system.
 *
 * Coverage (full-stack only — rendering, form validation, and role-based
 * rendering are covered by component tests):
 *  - Login page: happy paths (admin, agent), wrong password, unknown email
 *  - Protected routes: unauthenticated redirect, admin-only access, agent redirect
 *  - Session persistence: page refresh keeps the user logged in
 *  - Logout: clears session server-side and redirects to /login
 */

import { test, expect } from '@playwright/test';
import { loginViaUI, loginSuccessfully, ADMIN_AUTH_FILE, AGENT_AUTH_FILE } from './helpers/auth';

// ── 1. Login page ─────────────────────────────────────────────────────────────

test.describe('Login page', () => {
  // All tests in this group start unauthenticated (no storageState).
  test.use({ storageState: { cookies: [], origins: [] } });

  test('admin logs in successfully and is redirected to /', async ({ page }) => {
    await loginSuccessfully(page, {
      email: 'admin@example.com',
      password: 'password123',
    });

    await expect(page).toHaveURL('/');
    // Dashboard heading confirms ProtectedLayout resolved a session and rendered HomePage
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  });

  test('agent logs in successfully and is redirected to /', async ({ page }) => {
    await loginSuccessfully(page, {
      email: 'agent@example.com',
      password: 'password123',
    });

    await expect(page).toHaveURL('/');
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  });

  test('wrong password shows an error and stays on /login', async ({ page }) => {
    await loginViaUI(page, {
      email: 'admin@example.com',
      password: 'wrong-password',
    });

    // The form sets a root-level error; the component renders it in a <p> tag.
    // We do not assert the exact server message because it can vary; we just
    // assert that we are still on /login and that *some* error is visible.
    await expect(page).toHaveURL('/login');

    // The root error paragraph sits inside the form above the submit button.
    // It's the only <p> that carries the destructive colour class — match by
    // role + content pattern rather than by CSS class.
    const errorParagraph = page.locator('form p').last();
    await expect(errorParagraph).toBeVisible();
  });

  test('unknown email shows an error and stays on /login', async ({ page }) => {
    await loginViaUI(page, {
      email: 'nobody@example.com',
      password: 'password123',
    });

    await expect(page).toHaveURL('/login');

    const errorParagraph = page.locator('form p').last();
    await expect(errorParagraph).toBeVisible();
  });

});

// ── 2. Protected routes ───────────────────────────────────────────────────────

test.describe('Protected routes — unauthenticated user', () => {
  // No storageState — every test starts with a clean, logged-out context.
  test.use({ storageState: { cookies: [], origins: [] } });

  test('visiting / redirects to /login', async ({ page }) => {
    await page.goto('/');
    await page.waitForURL('/login');
    await expect(page).toHaveURL('/login');
  });

  test('visiting /users redirects to /login', async ({ page }) => {
    await page.goto('/users');
    await page.waitForURL('/login');
    await expect(page).toHaveURL('/login');
  });
});

test.describe('Protected routes — authenticated admin', () => {
  // Restore the pre-built admin session; no UI login needed.
  test.use({ storageState: ADMIN_AUTH_FILE });

  test('admin can visit / and sees the dashboard', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL('/');
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  });

  test('admin can visit /users and sees the Users page', async ({ page }) => {
    await page.goto('/users');
    await expect(page).toHaveURL('/users');
    await expect(page.getByRole('heading', { name: 'Users' })).toBeVisible();
  });
});

test.describe('Protected routes — authenticated agent', () => {
  test.use({ storageState: AGENT_AUTH_FILE });

  test('agent can visit / and sees the dashboard', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL('/');
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  });

  test('agent visiting /users is redirected to /', async ({ page }) => {
    // AdminLayout redirects non-admins to /
    await page.goto('/users');
    await page.waitForURL('/');
    await expect(page).toHaveURL('/');
  });
});

// ── 3. Session persistence ────────────────────────────────────────────────────

test.describe('Session persistence — admin', () => {
  // Restore the admin session cookie at the describe level (required by Playwright)
  test.use({ storageState: ADMIN_AUTH_FILE });

  test('admin session survives a full page reload', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL('/');

    // Hard reload — simulates the user hitting F5
    await page.reload();

    // ProtectedLayout must resolve the session from the cookie and NOT redirect
    await expect(page).toHaveURL('/');
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  });
});

test.describe('Session persistence — agent', () => {
  test.use({ storageState: AGENT_AUTH_FILE });

  test('agent session survives a full page reload', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL('/');

    await page.reload();

    await expect(page).toHaveURL('/');
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  });
});

// ── 4. Logout ─────────────────────────────────────────────────────────────────
//
// IMPORTANT: Logout tests must NOT reuse the shared storageState files.
// signOut() deletes the session from the database server-side. If the shared
// session token were used here, every other test that depends on that token
// would break when it runs after a logout test — regardless of worker isolation.
// Instead, each logout test logs in via UI to get a fresh, disposable session.

test.describe('Logout — admin', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('can sign out and is redirected to /login', async ({ page }) => {
    await loginSuccessfully(page, { email: 'admin@example.com', password: 'password123' });

    await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();
    await page.getByRole('button', { name: 'Sign out' }).click();
    await page.waitForURL('/login');
    await expect(page).toHaveURL('/login');
  });

  test('after signing out, navigating to / redirects back to /login', async ({ page }) => {
    await loginSuccessfully(page, { email: 'admin@example.com', password: 'password123' });

    await page.getByRole('button', { name: 'Sign out' }).click();
    await page.waitForURL('/login');

    await page.goto('/');
    await page.waitForURL('/login');
    await expect(page).toHaveURL('/login');
  });
});

test.describe('Logout — agent', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('can sign out and is redirected to /login', async ({ page }) => {
    await loginSuccessfully(page, { email: 'agent@example.com', password: 'password123' });

    await page.getByRole('button', { name: 'Sign out' }).click();
    await page.waitForURL('/login');
    await expect(page).toHaveURL('/login');
  });
});
