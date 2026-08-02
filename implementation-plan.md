## Implementation Plan

---

## Phase 1 — Project Setup & Infrastructure

- [x] Initialize monorepo structure (`/backend`, `/frontend`)
- [x] Set up backend: Bun + Express 5 + TypeScript (`tsconfig`, `prettier`)
- [x] Set up frontend: React 19 + TypeScript + Vite 6 + Tailwind 4
- [x] Docker Compose: PostgreSQL (pgvector/pg16) + Redis
- [x] Set up environment variable config (`.env` schema with Zod validation)

---

## Phase 2 — Database Schema (Prisma)

- [x] `User` model (id, email, name, passwordHash, role: ADMIN | AGENT, createdAt)
- [x] `Session` model (managed by connect-pg-simple at runtime via `createTableIfMissing`)
- [x] `Ticket` model (id, subject, body, summary, status, priority, tags, fromEmail, threadId, createdAt, updatedAt)
- [x] `Message` model (id, ticketId, fromEmail, body, direction: INBOUND | OUTBOUND, sentByAI, createdAt)
- [x] `KnowledgeBaseArticle` model (id, title, body, embedding vector(1536), createdAt, updatedAt)
- [x] `TicketAssignment` model (ticketId, agentId, assignedAt)
- [ ] Run initial migration

---

## Phase 3 — Authentication

- [ ] Install and configure `express-session` + `connect-pg-simple`
- [ ] `POST /auth/login` — validate credentials, create session
- [ ] `POST /auth/logout` — destroy session
- [ ] `GET /auth/me` — return current session user
- [ ] Auth middleware: `requireAuth`, `requireAdmin`, `requireAgent`
- [ ] Frontend: Login page
- [ ] Frontend: Auth context + protected route wrapper
- [ ] Admin: `POST /admin/agents` — create agent account
- [ ] Admin: `GET /admin/agents` — list agents

---

## Phase 4 — Email Integration

- [x] Choose provider: Mailgun; create account, configure MX records
- [ ] `POST /webhooks/email` — inbound parse webhook endpoint
- [ ] Parse inbound email payload (sender, subject, body, message ID, in-reply-to header)
- [ ] Thread detection: match `In-Reply-To` header to existing ticket → reopen/append message
- [ ] Email sending service: `sendReply(to, subject, body, threadId)`
- [ ] Webhook signature verification (security)

---

## Phase 5 — Ticket System

- [ ] Create ticket from inbound email (if no existing thread found)
- [ ] Ticket status transitions: `OPEN` → `IN_PROGRESS` → `RESOLVED` / `FLAGGED`
- [ ] `GET /tickets` — list tickets with filters (status, priority, tags, assignee)
- [ ] `GET /tickets/:id` — ticket detail with full message thread
- [ ] `PATCH /tickets/:id` — update status, priority, tags, assignment
- [ ] `POST /tickets/:id/messages` — agent manually sends a reply
- [ ] Pagination on ticket list

---

## Phase 6 — Knowledge Base

- [ ] Enable `pgvector` extension in PostgreSQL
- [ ] KB article CRUD: `GET/POST/PATCH/DELETE /admin/kb`
- [ ] Embedding pipeline: on KB article create/update, generate embedding via Claude (or OpenAI embeddings) and store in `KnowledgeBaseArticle.embedding`
- [ ] KB search function: given a query string, return top-N similar articles using cosine similarity
- [ ] Frontend: Admin KB management page (create, edit, delete articles)

---

## Phase 7 — AI Pipeline

- [ ] Set up Anthropic SDK + Claude API client
- [ ] BullMQ setup: `email-processing` queue + worker
- [ ] On inbound email → enqueue job (non-blocking webhook response)
- [ ] AI job steps (sequential):
  - [ ] **Summarize** email body
  - [ ] **Classify** intent / extract tags and category
  - [ ] **Determine priority** (LOW / MEDIUM / HIGH) based on content signals
  - [ ] **KB lookup** — semantic search for relevant articles
  - [ ] **Decision**: auto-reply (if menial + KB match found) or flag for agent
  - [ ] **Draft response** if auto-replying, using KB article as context
- [ ] Save AI summary, tags, priority back to ticket
- [ ] Auto-send reply via email service if decision = auto-reply; mark `sentByAI = true`
- [ ] Flag ticket as `FLAGGED` if decision = agent review

---

## Phase 8 — Agent Workflow

- [ ] Flagged ticket queue visible to agents (`GET /tickets?status=FLAGGED`)
- [ ] Agent claims a ticket (`PATCH /tickets/:id` → assign to self, status → `IN_PROGRESS`)
- [ ] Agent edits AI-drafted response and sends (`POST /tickets/:id/messages`)
- [ ] Track `sentByAI` vs human-sent on each outbound message
- [ ] Agent can reassign ticket to another agent
- [ ] Agent can update tags, priority, status

---

## Phase 9 — Dashboard & Frontend

- [ ] **Agent view**: ticket queue (filtered by status/priority), ticket detail, reply editor
- [ ] **Admin view**: all tickets, agent management, KB management, metrics panel
- [ ] Ticket filters: status, priority, tags, assigned agent, date range
- [ ] Metrics panel: total tickets, open vs resolved, avg response time, AI vs human reply ratio
- [ ] In-app notifications: toast/badge for new HIGH priority tickets (polling or SSE)
- [ ] Real-time ticket list refresh (polling every 30s or Server-Sent Events)

---

## Phase 10 — Hardening & Polish

- [ ] Input validation on all endpoints (`zod`)
- [ ] Rate limiting on webhook and auth endpoints (`express-rate-limit`)
- [ ] Error handling middleware (consistent error response shape)
- [ ] AI retry logic with exponential backoff on failed jobs
- [ ] BullMQ dead-letter queue for failed email jobs
- [ ] Logging (`winston` or `pino`)
- [ ] Environment-based config validation on startup

---

## Deferred (Post-MVP)

- Auto-populate KB from resolved tickets
- Email/SMS notifications for agents on high-priority tickets
- Escalation rules (auto-reassign if ticket sits unresolved for X hours)
- Customer-facing ticket status page
- Multi-inbox support
