/**
 * users.spec.ts — End-to-end tests for the /users admin page.
 *
 * Coverage (happy paths only):
 *  1. Read   — the users table loads and displays existing users
 *  2. Create — admin opens the create modal, fills the form, submits; new user
 *              appears in the table
 *  3. Edit   — admin opens the edit modal for a user, changes the name, saves;
 *              updated name appears in the table
 *  4. Delete — admin opens the delete modal for a user, confirms; user is
 *              removed from the table
 *
 * Authentication strategy:
 *  All tests restore the pre-built admin storageState so no UI login is needed.
 *  Tests that need a specific user in the DB create them via the API before the
 *  test runs and delete them (if not already deleted by the test) in afterEach.
 *
 * Test isolation:
 *  Each test generates a unique email via a timestamp suffix so tests can run
 *  in parallel without colliding on unique-email constraints.
 */

import { test, expect, type APIRequestContext } from '@playwright/test';
import { ADMIN_AUTH_FILE } from './helpers/auth';

const BACKEND_URL = 'http://localhost:3002';

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Sign in as admin and return a cookie string that can be passed as the
 * Cookie header in subsequent API calls made via `request`.
 *
 * We cannot reuse the storageState cookies directly from `request` here
 * because the `request` fixture in page-less tests does not automatically
 * restore storageState.  We sign in programmatically instead.
 */
async function getAdminCookie(request: APIRequestContext): Promise<string> {
  const res = await request.post(`${BACKEND_URL}/api/auth/sign-in/email`, {
    data: { email: 'admin@example.com', password: 'password123' },
    headers: { 'Content-Type': 'application/json' },
  });
  expect(res.status()).toBe(200);

  // Playwright's APIRequestContext accumulates cookies after the sign-in.
  // Export the storage state so we can extract the cookie value.
  const state = await request.storageState();
  const cookie = state.cookies
    .map((c) => `${c.name}=${c.value}`)
    .join('; ');
  return cookie;
}

interface CreatedUser {
  id: string;
  name: string;
  email: string;
}

/**
 * Create a user via the API and return its id + credentials.
 * The cookie must come from an authenticated admin context.
 */
async function createUserViaAPI(
  request: APIRequestContext,
  cookie: string,
  payload: { name: string; email: string; password: string },
): Promise<CreatedUser> {
  const res = await request.post(`${BACKEND_URL}/api/users`, {
    data: payload,
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookie,
    },
  });
  expect(res.status()).toBe(201);
  const body = await res.json() as { user: CreatedUser };
  return body.user;
}

/**
 * Delete a user via the API (soft-delete).  Ignores 404 so callers can call
 * this in afterEach without checking whether the test already deleted the user.
 */
async function deleteUserViaAPI(
  request: APIRequestContext,
  cookie: string,
  userId: string,
): Promise<void> {
  await request.delete(`${BACKEND_URL}/api/users/${userId}`, {
    headers: { Cookie: cookie },
  });
  // Intentionally not asserting status — 200 (deleted) and 404 (already gone)
  // are both acceptable.
}

// ── Unique email generator ────────────────────────────────────────────────────

function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}@test.example`;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test.describe('Users page — admin CRUD', () => {
  // All tests in this group use the pre-built admin session.
  test.use({ storageState: ADMIN_AUTH_FILE });

  // ── 1. Read ───────────────────────────────────────────────────────────────

  test.describe('Read — list users', () => {
    test('table loads and shows the seeded admin user', async ({ page }) => {
      await page.goto('/users');

      // Page heading confirms we are on the right page.
      await expect(page.getByRole('heading', { name: 'Users' })).toBeVisible();

      // The "Create user" button must be present.
      await expect(page.getByRole('button', { name: 'Create user' })).toBeVisible();

      // The table renders column headers.
      await expect(page.getByRole('columnheader', { name: 'Name' })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: 'Email' })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: 'Role' })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: 'Joined' })).toBeVisible();

      // The seeded admin is always present.
      await expect(page.getByRole('cell', { name: 'admin@example.com' })).toBeVisible();

      // Admin rows show the "admin" role badge.
      await expect(page.getByText('admin').first()).toBeVisible();

      // The seeded AI auto-resolve user is a system account and must never
      // appear in the admin list (it could otherwise be edited or deleted).
      await expect(page.getByRole('cell', { name: 'ai@example.com' })).not.toBeVisible();
    });

    test('newly-created user appears in the table', async ({ page, request }) => {
      // Set up: create a user via API so the table has a known entry.
      const cookie = await getAdminCookie(request);
      const email = uniqueEmail('read-test');
      const user = await createUserViaAPI(request, cookie, {
        name: 'Read Test User',
        email,
        password: 'password123',
      });

      try {
        await page.goto('/users');

        // Wait for the table to render actual data (not the loading skeleton).
        await expect(page.getByRole('cell', { name: email })).toBeVisible();
        await expect(page.getByRole('cell', { name: 'Read Test User', exact: true })).toBeVisible();

        // New users get the agent role.
        // There may be multiple "agent" badges; just assert at least one exists.
        await expect(page.getByText('agent').first()).toBeVisible();
      } finally {
        await deleteUserViaAPI(request, cookie, user.id);
      }
    });
  });

  // ── 2. Create ─────────────────────────────────────────────────────────────

  test.describe('Create — add a new user', () => {
    test('fills the create modal and new user appears in the table', async ({ page, request }) => {
      const cookie = await getAdminCookie(request);
      const email = uniqueEmail('create-test');
      let createdUserId: string | null = null;

      try {
        await page.goto('/users');

        // Open the create modal.
        await page.getByRole('button', { name: 'Create user' }).click();

        // The modal heading is visible.
        await expect(page.getByRole('heading', { name: 'Create user' })).toBeVisible();

        // Fill the form.  exact: true on Name avoids matching action buttons whose
        // aria-label contains "Name" (e.g. "Edit Some User Name").
        await page.getByLabel('Name', { exact: true }).fill('Create Test User');
        await page.getByLabel('Email').fill(email);
        await page.getByLabel('Password').fill('password123');

        // Submit — scope to form to disambiguate from the header "Create user" button.
        await page.locator('form').getByRole('button', { name: 'Create user' }).click();

        // Modal closes after a successful mutation.
        await expect(page.getByRole('heading', { name: 'Create user' })).not.toBeVisible();

        // The new row appears in the table.
        await expect(page.getByRole('cell', { name: email })).toBeVisible();
        await expect(page.getByRole('cell', { name: 'Create Test User', exact: true })).toBeVisible();

        // Look up the created user's id so we can clean up.
        const res = await request.get(`${BACKEND_URL}/api/users`, {
          headers: { Cookie: cookie },
        });
        const body = await res.json() as { users: CreatedUser[] };
        const created = body.users.find((u) => u.email === email);
        if (created) createdUserId = created.id;
      } finally {
        if (createdUserId) {
          await deleteUserViaAPI(request, cookie, createdUserId);
        }
      }
    });
  });

  // ── 3. Edit ───────────────────────────────────────────────────────────────

  test.describe('Edit — update an existing user', () => {
    test('opens the edit modal, changes name, and updated name appears in table', async ({
      page,
      request,
    }) => {
      // Set up: create a user to edit via API.
      const cookie = await getAdminCookie(request);
      const email = uniqueEmail('edit-test');
      const user = await createUserViaAPI(request, cookie, {
        name: 'Edit Original Name',
        email,
        password: 'password123',
      });

      try {
        await page.goto('/users');

        // Wait for the table row to be present before interacting.
        await expect(page.getByRole('cell', { name: email })).toBeVisible();

        // Scope to this user's row via the unique email — prevents false matches if
        // leftover same-named users from prior runs are still in the table.
        const editRow = page.getByRole('row').filter({ hasText: user.email });
        await editRow.getByRole('button', { name: `Edit ${user.name}` }).click();

        // Edit modal heading is visible.
        await expect(page.getByRole('heading', { name: 'Edit user' })).toBeVisible();

        // Clear the Name field and enter a new name.
        // exact: true avoids matching action buttons whose aria-label contains "Name".
        const nameInput = page.getByLabel('Name', { exact: true });
        await nameInput.clear();
        await nameInput.fill('Edit Updated Name');

        // Submit the form.
        await page.getByRole('button', { name: 'Save changes' }).click();

        // Modal closes after a successful save.
        await expect(page.getByRole('heading', { name: 'Edit user' })).not.toBeVisible();

        // The updated name now appears in the table.
        await expect(page.getByRole('cell', { name: 'Edit Updated Name', exact: true })).toBeVisible();

        // The original name is gone.
        await expect(page.getByRole('cell', { name: 'Edit Original Name' })).not.toBeVisible();
      } finally {
        await deleteUserViaAPI(request, cookie, user.id);
      }
    });
  });

  // ── 4. Delete ─────────────────────────────────────────────────────────────

  test.describe('Delete — remove a user', () => {
    test('opens the delete modal, confirms, and user is removed from the table', async ({
      page,
      request,
    }) => {
      // Set up: create a user to delete via API.
      const cookie = await getAdminCookie(request);
      const email = uniqueEmail('delete-test');
      const user = await createUserViaAPI(request, cookie, {
        name: 'Delete Test User',
        email,
        password: 'password123',
      });

      // No finally/cleanup needed — the test itself deletes the user.

      await page.goto('/users');

      // Wait for the user's row to appear.
      await expect(page.getByRole('cell', { name: email })).toBeVisible();

      // Scope to this user's row via the unique email — prevents false matches if
      // leftover same-named users from prior runs are still in the table.
      const deleteRow = page.getByRole('row').filter({ hasText: user.email });
      await deleteRow.getByRole('button', { name: `Delete ${user.name}` }).click();

      // The delete confirmation modal appears.
      await expect(page.getByRole('heading', { name: 'Delete user' })).toBeVisible();

      // The modal body names the user being deleted — scope to <strong> to avoid
      // matching the table cell that also contains the same name.
      await expect(page.locator('strong', { hasText: user.name })).toBeVisible();
      await expect(
        page.getByText('Are you sure you want to delete'),
      ).toBeVisible();

      // Confirm deletion.
      await page.getByRole('button', { name: 'Delete user' }).click();

      // Modal closes.
      await expect(page.getByRole('heading', { name: 'Delete user' })).not.toBeVisible();

      // The deleted user no longer appears in the table.
      await expect(page.getByRole('cell', { name: email })).not.toBeVisible();
      await expect(page.getByRole('cell', { name: user.name })).not.toBeVisible();
    });
  });
});
