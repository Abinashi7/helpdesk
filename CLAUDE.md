# Helpdesk — Project Memory

## What this is
AI-powered email ticket management system. Emails arrive via SendGrid/Mailgun webhook, Claude classifies and auto-replies to common questions from a knowledge base, complex ones are routed to human agents.

## Stack
- **Runtime**: Bun
- **Backend**: Express 5 + TypeScript + Prisma 6 (PostgreSQL + pgvector) + Redis + BullMQ
- **Frontend**: React 19 + Vite 6 + Tailwind CSS 4 + shadcn/ui
- **Auth**: better-auth (email+password, sign-up disabled — admin created via seed only)
- **AI**: Anthropic Claude API

## Monorepo layout
```
helpdesk/
├── backend/   — Express API (port 3001)
├── frontend/  — React app (port 5173)
├── e2e/       — Playwright end-to-end tests
├── .env       — root env file (loaded by backend via --env-file ../.env)
├── .env.test  — test env overrides (backend port 3002, postgres port 5434)
└── docker-compose.yml  — postgres (5432) + postgres_test (5434) + redis (6379)
```

## Dev commands
```bash
# Start infrastructure (includes test postgres on port 5434)
docker compose up -d

# Install deps (run from root)
bun install

# Generate Prisma client (run from backend/)
npx prisma generate

# Start backend
cd backend && bun --env-file ../.env src/index.ts

# Start frontend
cd frontend && bun run dev
```

## Authentication

**Library:** better-auth with Prisma adapter (PostgreSQL).

**Backend (`backend/src/lib/auth.ts`):**
- `emailAndPassword` enabled, `disableSignUp: true` — only seeded admin can log in
- Auth routes mounted at `/api/auth/*` via `toNodeHandler(auth)` — must come before `express.json()`
- CORS configured with `credentials: true` for `FRONTEND_URL`
- Required env vars: `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`
- `customSession` plugin (from `better-auth/plugins`) used to append `role` to the session user object — `additionalFields` alone does NOT include DB fields in the session response

**Protecting routes (`backend/src/middleware/requireAuth.ts` + `requireAdmin.ts`):**
- `requireAuth` calls `auth.api.getSession()`, attaches `res.locals.session` + `res.locals.user`, returns 401 if no session
- `requireAdmin` checks `res.locals.user.role === 'admin'`, returns 403 otherwise
- Always apply **both** to admin-scoped routes: `requireAuth, requireAdmin, handler`

**Frontend (`frontend/src/lib/auth-client.ts`):**
- `createAuthClient({ baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3001' })`
- `VITE_API_URL` is set in `frontend/.env` (dev) and injected by Playwright webServer env for e2e tests
- Use `authClient.useSession()` to read session in components
- `authClient.signIn.email()` / `authClient.signOut()` for login/logout
- `App.tsx` wraps protected routes in `<ProtectedLayout>` (auth check) or `<AdminLayout>` (auth + role === 'admin' check); non-admins hitting admin routes are redirected to `/`
- Access role via `session.user as { role?: string }` cast — `customSessionClient` not used (would require importing backend types into frontend)

**Roles:** `admin` | `agent` (Prisma enum). Navbar shows admin-only links based on `session.user.role`.

**Seeding / creating users:**
```bash
# Seed admin into dev DB (uses SEED_ADMIN_EMAIL + SEED_ADMIN_PASSWORD from .env):
cd backend && bun run db:seed

# Seed admin into test DB:
cd backend && bun run db:seed:test

# Create any user via inline script (bypass disableSignUp):
cd backend && bun --env-file ../.env -e "
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { PrismaClient } from './generated/prisma/index.js';
const prisma = new PrismaClient();
const auth = betterAuth({ baseURL: process.env.BETTER_AUTH_URL, secret: process.env.BETTER_AUTH_SECRET, database: prismaAdapter(prisma, { provider: 'postgresql' }), emailAndPassword: { enabled: true } });
await auth.api.signUpEmail({ body: { email: 'user@example.com', password: 'password123', name: 'Name' } });
// optionally: await prisma.user.update({ where: { email: '...' }, data: { role: 'admin' } });
await prisma.\$disconnect();
"
```

**Test users (dev):**
- admin@example.com / (see .env SEED_ADMIN_PASSWORD) — role: admin
- agent@example.com / password123 — role: agent

## Pages & routes
| Path | Access | Component |
|------|--------|-----------|
| `/login` | public | `LoginPage` |
| `/` | any logged-in | `HomePage` |
| `/users` | admin only | `UsersPage` |

## Security hardening (done)
- `requireAdmin` middleware (`backend/src/middleware/requireAdmin.ts`) — always pair with `requireAuth` on admin routes
- `BETTER_AUTH_SECRET` validated at startup: min 32 chars, rejects placeholder value
- Error handler never forwards `err.message` to clients — logs internally, returns generic 500
- Rate limiting on `/api/auth/*splat` — **production only** (`NODE_ENV === 'production'`), 20 req / 15 min
- `SESSION_SECRET` removed (was unused; better-auth uses `BETTER_AUTH_SECRET`)

## E2E testing (Playwright)
- Tests live in `e2e/tests/` — run with `bun run test:e2e` from root
- Separate test database: `helpdesk_test` on port **5434** (container: `helpdesk_postgres_test`, auth: md5)
- Test backend runs on port **3002** using `.env.test`; test frontend runs on port **5174**
- `e2e/global-setup.ts` runs `prisma migrate deploy` against the test DB automatically before every test run
- `e2e/playwright.config.ts` — two `webServer` entries (backend + frontend), `reuseExistingServer: !CI`
- Connect to test DB in IDE: host `localhost`, port `5434`, user/pass/db `helpdesk` / `helpdesk` / `helpdesk_test`

```bash
# Run all e2e tests
bun run test:e2e

# Interactive Playwright UI
cd e2e && bun run test:ui

# Migrate test DB manually
cd backend && bun run db:migrate:test
```

## Progress
- **Phase 1** (Project setup) — done
- **Phase 2** (Auth) — done: better-auth, login page with react-hook-form + zod, session-based protected routes, seed script with admin user
- **Phase 2.5** (Role-based access) — done: `customSession` plugin exposes role, `AdminLayout` guard, admin-only nav links, agent test user
- **Phase 2.6** (Security hardening) — done: `requireAdmin`, secret validation, error handler hardening, rate limiting (prod only), Playwright e2e setup with separate test DB
- **Phase 3+** — not started

## Frontend notes
- shadcn/ui initialized with `base-nova` style, `neutral` color scheme, Tailwind v4 CSS variables
- Components available: `Button`, `Input`, `Label` (in `frontend/src/components/ui/`)
- Chrome autofill style override in `frontend/src/index.css` (uses hardcoded colors + `!important`)
- `frontend/src/vite-env.d.ts` provides `import.meta.env` types (standard Vite file, required for `VITE_*` env vars)

## Using Context7 for documentation
Always use Context7 MCP to fetch current documentation before writing code that uses any library, framework, or API. Training data may be outdated.

Steps:
1. Call `mcp__context7__resolve-library-id` with the library name and question
2. Pick the best match by exact name, description relevance, and benchmark score
3. Call `mcp__context7__query-docs` with the library ID and the full question
4. Write code using the fetched docs

Apply this for: Express, Prisma, React, Vite, Tailwind, BullMQ, ioredis, Anthropic SDK, shadcn/ui, Zod, TanStack Query, react-router-dom — and any other library touched in this project.
