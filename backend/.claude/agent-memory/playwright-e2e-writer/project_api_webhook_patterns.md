---
name: API-only webhook test patterns
description: Patterns for testing pure API endpoints (no browser) in Playwright, established when writing webhooks.spec.ts
type: project
---

Use `request` fixture only — no `page`, no `storageState` needed for token-authenticated or unauthenticated API endpoints.

**Why:** `storageState` is for cookie-based browser sessions. Webhook endpoints use query-param tokens or are open; importing the `page` fixture unnecessarily makes tests slower.

**How to apply:** When writing tests for a pure REST endpoint, structure the test file with no `test.use({ storageState })` block. Just import `{ test, expect }` and use the `request` fixture directly.

## Key patterns

### Conditional skip for env-gated behaviour
```typescript
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET ?? '';
// inside test:
test.skip(!WEBHOOK_SECRET, 'WEBHOOK_SECRET not set — skipping auth tests');
```
The Playwright `request` fixture in webServer-driven e2e runs inherits `process.env` from the shell, NOT from `.env.test` directly. Environment variables from `.env.test` are passed to the backend via `bun --env-file`, but Playwright's test process must receive them separately (e.g., via shell export or `dotenv` in global-setup) for `process.env.WEBHOOK_SECRET` to be defined in test files.

### Idempotency test isolation
Use `Date.now()` in `messageId` to prevent collision across parallel runs:
```typescript
const messageId = `idempotency-test-${Date.now()}`;
```

### Payload helpers
Define a `validPayload(overrides?)` helper returning a base object spread with overrides — this avoids repeating all required fields in every test.

### Destructure-to-omit pattern (avoiding `delete`)
```typescript
const { fieldName: _omitted, ...rest } = payload as { fieldName: string; [key: string]: unknown };
```

## Ticket cleanup
No `DELETE /api/tickets/:id` route exists. Tickets created in webhook tests are left in the DB — the test DB is reset between CI runs by global-setup running `prisma migrate deploy`.

## WEBHOOK_SECRET in .env.test
As of 2026-05-02, `WEBHOOK_SECRET` is **not set** in `.env.test`. Auth tests are always skipped in the standard test run. To exercise auth tests, add `WEBHOOK_SECRET=<value>` to `.env.test` and export it to the shell before running Playwright.
