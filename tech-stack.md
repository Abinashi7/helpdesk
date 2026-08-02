## Tech Stack

## Backend
- **Runtime**: Node.js
- **Framework**: Express
- **Language**: TypeScript
- **ORM**: Prisma

## Frontend
- **Framework**: React + TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui

## Database
- **Primary DB**: PostgreSQL
- **Vector extension**: pgvector (for knowledge base semantic search)
- **Cache / Queue store**: Redis

## Authentication
- Database sessions via `express-session` + `connect-pg-simple` (sessions stored in PostgreSQL)
- Role-based: Admin and Agent roles

## Background Jobs
- **Queue**: BullMQ + Redis (async email processing, AI calls)

## Email
- **Provider**: Mailgun (end-to-end) — chosen Aug 2026 after SendGrid retired its permanent free tier
- **Inbound**: Inbound parse webhook — provider receives emails at your support address and POSTs them to your Express endpoint
- **Outbound**: Send replies via provider API

## AI
- **Model**: Claude API (Anthropic) — classification, summarization, KB lookup, response drafting

## Deployment
- Docker Compose (local dev + production)
