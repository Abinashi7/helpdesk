# Helpdesk — Project Memory

## What this is
AI-powered email ticket management system. Emails arrive via SendGrid/Mailgun webhook, Claude classifies and auto-replies to common questions from a knowledge base, complex ones are routed to human agents.

## Stack
- **Runtime**: Bun
- **Backend**: Express 5 + TypeScript + Prisma 6 (PostgreSQL + pgvector) + Redis + BullMQ
- **Frontend**: React 19 + Vite 6 + Tailwind CSS 4 + shadcn/ui
- **Auth**: express-session + connect-pg-simple
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

## Using Context7 for documentation
Always use Context7 MCP to fetch current documentation before writing code that uses any library, framework, or API. Training data may be outdated.

Steps:
1. Call `mcp__context7__resolve-library-id` with the library name and question
2. Pick the best match by exact name, description relevance, and benchmark score
3. Call `mcp__context7__query-docs` with the library ID and the full question
4. Write code using the fetched docs

Apply this for: Express, Prisma, React, Vite, Tailwind, BullMQ, ioredis, Anthropic SDK, shadcn/ui, Zod, TanStack Query, react-router-dom — and any other library touched in this project.
