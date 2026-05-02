---
name: CRUD test patterns for user management
description: API-driven state setup/teardown, selector strategies for UsersTable/modals, and isolation approach for user CRUD e2e tests
type: project
---

## State isolation strategy for CRUD tests

For tests that need specific DB state (a user to edit/delete), create the record via the API *before* the test, not via the UI. Use `request` fixture + `getAdminCookie()` helper to get a cookie, then `POST /api/users`. Clean up in a `finally` block with `DELETE /api/users/:id`.

**Why:** Tests that rely on leftover DB state from other tests are order-dependent and fragile. API-driven setup also keeps the test focused on the single action being tested.

For Delete tests specifically, no cleanup is needed — the test itself deletes the user.

## Getting an admin cookie in the `request` fixture

The `request` fixture in spec files does NOT automatically restore storageState even when `test.use({ storageState: ADMIN_AUTH_FILE })` is declared. Must call `POST /api/auth/sign-in/email` programmatically, then extract cookie via `await request.storageState()`:

```ts
const state = await request.storageState();
const cookie = state.cookies.map(c => `${c.name}=${c.value}`).join('; ');
```

Pass `cookie` as a `Cookie` header on subsequent `request.get/post/patch/delete` calls.

## Unique email generation

Use a timestamp suffix to avoid unique-email constraint collisions when tests run in parallel:
```ts
function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}@test.example`;
}
```

## Selectors for UsersTable.tsx

- Edit button: `getByRole('button', { name: 'Edit {user.name}' })` — aria-label set in UsersTable.tsx
- Delete button: `getByRole('button', { name: 'Delete {user.name}' })` — only rendered for non-admin users
- Table cells: `getByRole('cell', { name: email/name })` — works well for exact matches

## Selectors for modals

### CreateUserModal
- Heading: `getByRole('heading', { name: 'Create user' })`
- Name input: `getByLabel('Name')` — htmlFor="cu-name"
- Email input: `getByLabel('Email')` — htmlFor="cu-email"
- Password input: `getByLabel('Password')` — htmlFor="cu-password"
- Submit: `getByRole('button', { name: 'Create user' })`
- Cancel: `getByRole('button', { name: 'Cancel' })`

### EditUserModal
- Heading: `getByRole('heading', { name: 'Edit user' })`
- Name input: `getByLabel('Name')` — htmlFor="eu-name"
- Email input: `getByLabel('Email')` — htmlFor="eu-email"
- Password input: `getByLabel('New password')` — htmlFor="eu-password"
- Submit: `getByRole('button', { name: 'Save changes' })`

### DeleteUserModal
- Heading: `getByRole('heading', { name: 'Delete user' })`
- User name shown in body as `<strong>`
- Confirm: `getByRole('button', { name: 'Delete user' })`

## Important domain rules

- `createUser` in backend sets role to `agent` always — no role field in create form
- Admin users cannot be deleted (403) and have no Delete button in the table
- `updateUser` does NOT update role — EditUserModal has no role selector
- Soft-delete: `deleteUser` sets `deletedAt`, does not remove the DB row
