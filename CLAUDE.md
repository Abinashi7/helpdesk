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
├── .env       — root env file (loaded by backend via --env-file ../.env)
└── docker-compose.yml  — postgres (5432) + redis (6379)
```

## Dev commands
```bash
# Start infrastructure
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

**Protecting routes (`backend/src/middleware/requireAuth.ts`):**
- `requireAuth` middleware calls `auth.api.getSession()` and attaches `res.locals.session` + `res.locals.user`
- Returns 401 JSON if no session

**Frontend (`frontend/src/lib/auth-client.ts`):**
- `createAuthClient({ baseURL: 'http://localhost:3001' })` — hardcoded dev URL
- Use `authClient.useSession()` to read session in components
- `authClient.signIn.email()` / `authClient.signOut()` for login/logout
- `App.tsx` wraps protected routes in `<ProtectedLayout>` (auth check) or `<AdminLayout>` (auth + role === 'admin' check); non-admins hitting admin routes are redirected to `/`
- Access role via `session.user as { role?: string }` cast — `customSessionClient` not used (would require importing backend types into frontend)

**Roles:** `admin` | `agent` (Prisma enum). Navbar shows admin-only links based on `session.user.role`.

**Seeding / creating users:**
```bash
# Seed admin (uses env vars SEED_ADMIN_EMAIL + SEED_ADMIN_PASSWORD):
cd backend && bun --env-file ../.env prisma/seed.ts

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

## Progress
- **Phase 1** (Project setup) — done
- **Phase 2** (Auth) — done: better-auth, login page with react-hook-form + zod, session-based protected routes, seed script with admin user
- **Phase 2.5** (Role-based access) — done: `customSession` plugin exposes role, `AdminLayout` guard, admin-only nav links, agent test user
- **Phase 3+** — not started

## Frontend notes
- shadcn/ui initialized with `base-nova` style, `neutral` color scheme, Tailwind v4 CSS variables
- Components available: `Button`, `Input`, `Label` (in `frontend/src/components/ui/`)
- Chrome autofill style override in `frontend/src/index.css` (uses hardcoded colors + `!important`)

## Using Context7 for documentation
Always use Context7 MCP to fetch current documentation before writing code that uses any library, framework, or API. Training data may be outdated.

Steps:
1. Call `mcp__context7__resolve-library-id` with the library name and question
2. Pick the best match by exact name, description relevance, and benchmark score
3. Call `mcp__context7__query-docs` with the library ID and the full question
4. Write code using the fetched docs

Apply this for: Express, Prisma, React, Vite, Tailwind, BullMQ, ioredis, Anthropic SDK, shadcn/ui, Zod, TanStack Query, react-router-dom — and any other library touched in this project.
