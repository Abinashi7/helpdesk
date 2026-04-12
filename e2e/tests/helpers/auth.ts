/**
 * Shared auth helpers for Playwright e2e tests.
 *
 * loginViaUI — drives the actual login form in the browser.  Use this only
 * for tests that specifically validate the login UI (error states, validation
 * messages, redirect behaviour).  For tests that simply need an authenticated
 * context, use `test.use({ storageState: ADMIN_AUTH_FILE })` instead.
 */

import { type Page, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const ADMIN_AUTH_FILE = path.join(__dirname, '../../.auth/admin.json');
export const AGENT_AUTH_FILE = path.join(__dirname, '../../.auth/agent.json');

export interface LoginOptions {
  email: string;
  password: string;
}

/**
 * Fill and submit the Sign-in form, then wait for navigation away from /login.
 * Returns without assertion — callers decide what to assert next.
 */
export async function loginViaUI(page: Page, { email, password }: LoginOptions): Promise<void> {
  await page.goto('/login');

  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
}

/**
 * Perform a full successful login as the given credentials and wait until the
 * browser has navigated to the home route.
 */
export async function loginSuccessfully(
  page: Page,
  credentials: LoginOptions,
): Promise<void> {
  await loginViaUI(page, credentials);
  await page.waitForURL('/');
}
