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

**Protecting routes (`backend/src/middleware/requireAuth.ts`):**
- `requireAuth` middleware calls `auth.api.getSession()` and attaches `res.locals.session` + `res.locals.user`
- Returns 401 JSON if no session

**Frontend (`frontend/src/lib/auth-client.ts`):**
- `createAuthClient({ baseURL: 'http://localhost:3001' })` — hardcoded dev URL
- Use `authClient.useSession()` to read session in components
- `authClient.signIn.email()` / `authClient.signOut()` for login/logout
- `App.tsx` wraps protected routes in `<ProtectedLayout>` which redirects to `/login` if no session

**Seeding admin (`backend/prisma/seed.ts`):**
```bash
# Requires in .env:
SEED_ADMIN_EMAIL=admin@example.com
SEED_ADMIN_PASSWORD=yourpassword

cd backend && bun --env-file ../.env prisma/seed.ts
```

## Progress
- **Phase 1** (Project setup) — done
- **Phase 2** (Auth) — done: better-auth, login page with react-hook-form + zod, session-based protected routes, seed script with admin user
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
