# Helpdesk — Project Memory

## What this is
AI-powered email ticket management system. Emails arrive via a Mailgun inbound-route webhook, Claude classifies and auto-replies to common questions from a knowledge base, complex ones are routed to human agents.

## Stack
- **Runtime**: Bun
- **Backend**: Express 5 + TypeScript + Prisma 6 (PostgreSQL + pgvector) + Redis + BullMQ
- **Frontend**: React 19 + Vite 6 + Tailwind CSS 4 + shadcn/ui
- **Auth**: better-auth (email+password, sign-up disabled — admin created via seed only)
- **AI**: OpenAI `gpt-5-nano` (default model for all AI features — classify worker, auto-resolve worker, summarize endpoint)
- **Email**: Mailgun (`mailgun.js`) — outbound sends and inbound routes. Migrated off SendGrid in Aug 2026 when its permanent free tier was retired.

## Email (Mailgun)

**Outbound** — `backend/src/lib/mailer.ts` exposes `sendEmail()`, driven by the `send-email` pg-boss queue. Needs `MAILGUN_API_KEY`, `MAILGUN_DOMAIN`, `MAILGUN_FROM_EMAIL`; no-ops with a warning when unset. EU-region accounts must set `MAILGUN_API_URL=https://api.eu.mailgun.net`.

**Inbound** — `POST /api/webhooks/email` (`backend/src/routes/webhooks.ts`). Configure a Mailgun route with the **Store and notify** action pointing at that URL.

- Mailgun posts `application/x-www-form-urlencoded`, switching to `multipart/form-data` when the message has attachments. The route chains `express.urlencoded()` and `multer` so both parse.
- Fields used: `from`, `subject`, `stripped-text` → `body-plain` → `body-html` (in that order — `stripped-text` drops the quoted thread, which keeps replies useful for classification), and `message-headers` (a JSON array of `[name, value]` pairs) for the `Message-Id`.

**Webhook auth** — `backend/src/middleware/verifyMailgunWebhook.ts`:
- When `MAILGUN_SIGNING_KEY` is set, requests must carry a valid Mailgun HMAC-SHA256 signature over `timestamp + token`. **Set this in production.**
- Otherwise falls back to the `WEBHOOK_SECRET` shared secret (dev + e2e, where requests aren't Mailgun-signed).
- In production with neither set, the endpoint returns 401 rather than accepting unauthenticated ticket creation.
- The signature is in the request *body*, so this middleware runs **after** the body parsers — unlike every other middleware in the app.

## Monorepo layout
```
helpdesk/
├── core/      — shared package (@helpdesk/core): Zod schemas and types used by both backend and frontend
├── backend/   — Express API (port 3001)
├── frontend/  — React app (port 5173)
├── e2e/       — Playwright end-to-end tests
├── .env       — root env file (loaded by backend via --env-file ../.env)
├── .env.test  — test env overrides (backend port 3002, postgres port 5434)
└── docker-compose.yml  — postgres (5432) + postgres_test (5434) + redis (6379)
```

## Shared code (`core/`)
Any Zod schema that is used for both API validation (backend) and form validation (frontend) must live in `core/src/schemas/`. Export it from `core/src/index.ts` and import it in both packages as `@helpdesk/core`. Never duplicate a schema — if it validates a request body on the server it should be the same object validating the form on the client.

- Schema files: `core/src/schemas/<resource>.ts`
- Each schema file exports the schema and its inferred type (`z.infer<typeof ...>`)
- `core` has no build step — Bun and Vite both resolve TypeScript source directly via the `exports` field in `core/package.json`

## Enums
All enums live in `core/src/enums.ts` and are exported from `@helpdesk/core`. **Never define an enum only in the Prisma-generated client** — always mirror it here so both backend and frontend can import from the same source.

Current enums: `Role`, `TicketStatus`, `TicketCategory`.

```typescript
import { Role, TicketStatus, TicketCategory } from '@helpdesk/core';
```
- Use the const values everywhere (e.g. `Role.admin`, `TicketStatus.open`, `TicketCategory.billing`) — never raw strings
- The backend may also import enums from the Prisma-generated client (`backend/src/lib/types.ts`) when required for DB writes — that is acceptable. For plain comparisons and Zod validation, always use the core enum.

## Route body validation
All route handlers validate request bodies using the shared `validate()` helper:

```typescript
import { validate } from '../lib/validate.js';

const data = validate(mySchema, req.body, res);
if (!data) return;
```

**Never** duplicate inline `safeParse` logic in a route handler. The helper lives at `backend/src/lib/validate.ts` and handles the 400 response automatically.

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
- Always use the `Role` enum (re-exported from `backend/src/lib/types.ts`) instead of raw strings — e.g. `Role.agent`, not `'agent'`.

**Seeding / creating users:**
```bash
# Seed admin into dev DB (uses SEED_ADMIN_EMAIL + SEED_ADMIN_PASSWORD from .env):
cd backend && bun run db:seed

# Seed admin into test DB:
cd backend && bun run db:seed:test

# Load demo data: 93 tickets across the trailing 30 days + one 50-message thread.
# Requires db:seed first. Idempotent — clears its own `seed-` prefixed rows each run.
cd backend && bun run db:seed:demo

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

## Testing strategy

**Default to component tests. Write e2e tests only when a test genuinely requires the full stack.**

### Component tests (Vitest + React Testing Library) — use these first

Tests live in `frontend/src/` alongside the component they test (e.g. `UsersPage.test.tsx` next to `UsersPage.tsx`).

Cover with component tests:
- All rendering states: loading skeleton, success, error, empty
- Conditional rendering based on props or role (e.g. which nav links appear)
- UI data formatting (dates, badges, labels)
- Form validation and submission behaviour
- Correct API endpoint called (`expect(api.apiFetch).toHaveBeenCalledWith(...)`)

#### Commands (run from `frontend/`)
```bash
bun run test          # single run (CI)
bun run test:watch    # watch mode — reruns on save
bun run test:ui       # browser UI at localhost:51204/__vitest__/ — best for writing tests
```

#### Setup files
- `frontend/src/test/setup.ts` — imports `@testing-library/jest-dom` to extend `expect` with DOM matchers
- `frontend/src/test/renderWithQuery.tsx` — `renderWithQuery(ui)` helper that wraps any component in a fresh `QueryClientProvider` (retry disabled)
- For components that use `react-router-dom` hooks (`useNavigate`, `NavLink`): wrap in `<MemoryRouter>` from `react-router-dom`
- For components that use `authClient.useSession()`: mock `@/lib/auth-client` with `vi.mock`

#### Conventions
- Mock `@/lib/api` at the module level with `vi.mock('@/lib/api')`, then set per-test behaviour with `vi.mocked(api.apiFetch).mockResolvedValue(...)` / `.mockRejectedValue(...)`
- Always use `vi.resetAllMocks()` in `beforeEach` so mock state never leaks between tests
- Use `await waitFor(...)` for anything that depends on a resolved query; check synchronously for loading/pending state by returning a never-resolving promise: `new Promise(() => {})`
- Use noon UTC timestamps in mock dates (`T12:00:00Z`) to avoid timezone-boundary failures across environments
- Import `{ vi, describe, it, expect, beforeEach }` explicitly from `vitest` — `globals: true` is enabled but explicit imports are preferred for clarity

#### What to test per component
| State | How |
|-------|-----|
| Loading skeleton | mock `apiFetch` with `new Promise(() => {})`, assert skeleton elements and absence of real data |
| Success | mock resolved value, `waitFor` real data to appear |
| Error | mock rejected value, `waitFor` error message |
| Role badges / formatting | assert text content after successful fetch |
| Correct API call | `expect(api.apiFetch).toHaveBeenCalledWith('/api/...')` |

### E2E tests (Playwright) — only when necessary

**The bar is high.** Only write an e2e test when a component test genuinely cannot cover the behaviour. Ask: "Could this pass with a mocked API?" If yes, it belongs in a component test.

Write e2e tests **only** for:
- **Auth guards / routing**: redirects that depend on real session cookies and `ProtectedLayout` / `AdminLayout`
- **DB persistence verified by reload**: mutate via the UI, reload the page, confirm the change survived the round-trip — the component test only checks the API call was made, not that the DB persisted it
- **Cross-layer ordering / aggregation**: DB sort order or insertion order reflected in the rendered list
- **Multi-step flows across pages**: navigate to page A, perform an action, verify the result on page B

**Never** write e2e tests for:
- Rendering (headings, labels, data display) — component test
- Form validation (empty fields, format errors, disabled states) — component test
- Loading / skeleton / error states — component test
- Conditional rendering based on role — component test (e.g. `Navbar.test.tsx` already covers which nav links appear)
- Single-page interactions where every API call is mockable — component test

When in doubt, write the component test. E2e tests are expensive to run and maintain; keep the suite lean by removing any e2e test the moment an equivalent component test exists.

#### Running e2e tests
```bash
bun run test:e2e                        # all tests (from repo root)
bun run test:e2e -- --grep "<pattern>"  # targeted run
```
- Tests live in `e2e/tests/` — connect to test DB at `localhost:5434` (user/pass/db: `helpdesk`)
- Full setup details and conventions are in `backend/.claude/agents/playwright-e2e-writer.md`

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

## Reusable UI components

### `ErrorMessage` (`frontend/src/components/ui/error-message.tsx`)
Use for all plain error text. Base style: `text-sm text-destructive`. Pass `className` for spacing or size overrides.

```tsx
import { ErrorMessage } from '@/components/ui/error-message';

// inline field validation (smaller)
<ErrorMessage className="text-xs">{errors.name.message}</ErrorMessage>

// page-level load failure (with top margin)
<ErrorMessage className="mt-6">Failed to load tickets.</ErrorMessage>

// mutation error below a form control
<ErrorMessage className="mt-1 text-xs">Failed to send reply.</ErrorMessage>
```

Do **not** use for the banner-style submit errors (the ones with `rounded-lg bg-destructive/10` background) — those are visually distinct and remain as plain `<p>` tags.

## Using Context7 for documentation
Always use Context7 MCP to fetch current documentation before writing code that uses any library, framework, or API. Training data may be outdated.

Steps:
1. Call `mcp__context7__resolve-library-id` with the library name and question
2. Pick the best match by exact name, description relevance, and benchmark score
3. Call `mcp__context7__query-docs` with the library ID and the full question
4. Write code using the fetched docs

Apply this for: Express, Prisma, React, Vite, Tailwind, BullMQ, ioredis, Anthropic SDK, shadcn/ui, Zod, TanStack Query, react-router-dom — and any other library touched in this project.
