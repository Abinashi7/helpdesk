---
name: E2E test structure and conventions
description: File locations, Playwright setup project pattern, storageState strategy, and test organisation for the helpdesk monorepo
type: project
---

## File locations

- Playwright config: `e2e/playwright.config.ts`
- Global setup (Prisma migrations): `e2e/global-setup.ts`
- Test files: `e2e/tests/`
- Auth setup (session baking): `e2e/tests/auth.setup.ts`
- Shared helpers: `e2e/tests/helpers/auth.ts`
- Generated session files: `e2e/tests/.auth/` (gitignored)
- e2e package: `e2e/package.json` — runtime is Bun, `@playwright/test ^1.51.0`

## Setup project pattern

`playwright.config.ts` declares two projects:
1. `setup` — `testMatch: /.*\.setup\.ts/` — runs first, produces `.auth/*.json` files
2. `chromium` — `dependencies: ['setup']` — all real tests, no default storageState at config level

Tests that need authenticated state declare `test.use({ storageState: ADMIN_AUTH_FILE })` at the `test.describe` level. Tests that must be unauthenticated declare `test.use({ storageState: { cookies: [], origins: [] } })`.

## storageState files

- `ADMIN_AUTH_FILE` = `e2e/tests/.auth/admin.json`
- `AGENT_AUTH_FILE` = `e2e/tests/.auth/agent.json`
Both are exported from `auth.setup.ts` and imported by spec files.

## Auth setup approach

`auth.setup.ts` uses `request.post()` (APIRequestContext — no browser) to call `POST http://localhost:3002/api/auth/sign-in/email` with `{ email, password }`, then calls `request.storageState({ path })` to persist cookies. This avoids browser overhead for session baking.

**Why:** better-auth is cookie-based; posting to the sign-in endpoint returns a `Set-Cookie` header that the APIRequestContext collects automatically, making `storageState()` the correct capture mechanism.

## Test env

- Frontend: `http://localhost:5174` (Vite `--port 5174`)
- Backend: `http://localhost:3002` (loaded from `.env.test`, `PORT=3002`)
- `.env.test` is at monorepo root: `/home/asingh/Desktop/projects/helpdesk/.env.test`
- Admin password in `.env.test`: `SEED_ADMIN_PASSWORD=password123`
- Agent: `agent@example.com` / `password123`

## webServer config

Both servers use `reuseExistingServer: !process.env.CI`. The frontend receives `VITE_API_URL=http://localhost:3002` via `env:` in the webServer block so the auth client hits the test backend.
