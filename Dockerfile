# ── Stage 1: Install dependencies ───────────────────────────────────────────
FROM oven/bun:1 AS deps
WORKDIR /app

# Copy workspace manifests only — allows Docker to cache the install layer
# separately from source code changes.
COPY package.json bun.lock ./
COPY core/package.json ./core/
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/
COPY e2e/package.json ./e2e/

# Skip Playwright browser binaries — not needed in production.
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

# copyfile backend physically copies packages into node_modules instead of
# hardlinking from Bun's global cache, making them portable across stages.
RUN bun install --frozen-lockfile --backend=copyfile

# ── Stage 2: Build ──────────────────────────────────────────────────────────
FROM deps AS builder
WORKDIR /app

COPY core ./core
COPY backend ./backend
COPY frontend ./frontend
COPY knowledge-base.md ./

# Bun stores packages in node_modules/.bun/ which is outside the standard
# module resolution path. Symlink prisma so prisma.config.ts can import it.
RUN ln -sf /app/node_modules/.bun/node_modules/prisma /app/node_modules/prisma && \
    ln -sf /app/node_modules/.bun/node_modules/@prisma /app/node_modules/@prisma

# Generate the Prisma client into backend/generated/prisma.
# A placeholder DATABASE_URL is required by prisma.config.ts at config-load
# time — no real DB connection is made during generate.
RUN cd backend && DATABASE_URL="postgresql://x:x@localhost:5432/x" \
    bun /app/node_modules/.bun/node_modules/prisma/build/index.js generate

# Build the React app into frontend/dist.
# Vite inlines VITE_* at build time, so it must be an ARG — Railway passes service
# variables to a Dockerfile build only for args the Dockerfile declares.
ARG VITE_DEMO_MODE
ENV VITE_DEMO_MODE=$VITE_DEMO_MODE
RUN cd frontend && bun run build

# ── Stage 3: Production image ────────────────────────────────────────────────
FROM oven/bun:1-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

# Workspace root — bun needs these to resolve workspace packages at runtime.
COPY --from=builder /app/package.json /app/bun.lock ./
COPY --from=builder /app/node_modules ./node_modules

# Shared types package (no build step — bun resolves TypeScript directly).
COPY --from=builder /app/core ./core

# Backend: source + generated Prisma client + migrations.
# backend/node_modules holds the workspace's (non-hoisted) dependency symlinks
# — express, @sentry/node, @helpdesk/core, etc. — which point back into the
# root node_modules/.bun store. Without it bun cannot resolve backend deps.
COPY --from=builder /app/backend/node_modules ./backend/node_modules
COPY --from=builder /app/backend/src ./backend/src
COPY --from=builder /app/backend/generated ./backend/generated
COPY --from=builder /app/backend/prisma ./backend/prisma
COPY --from=builder /app/backend/package.json ./backend/
COPY --from=builder /app/backend/prisma.config.ts ./backend/

# Built frontend (served as static files by the Express backend).
COPY --from=builder /app/frontend/dist ./frontend/dist

# Knowledge base read at runtime by the auto-resolve worker.
COPY --from=builder /app/knowledge-base.md ./

# Symlink prisma into the standard node_modules path so prisma.config.ts
# can import 'prisma/config' when running migrate deploy at startup.
RUN ln -sf /app/node_modules/.bun/node_modules/prisma /app/node_modules/prisma && \
    ln -sf /app/node_modules/.bun/node_modules/@prisma /app/node_modules/@prisma

EXPOSE 3000

# Run DB migrations, seed the required admin + AI users (idempotent — skips
# users that already exist), then start the backend (which also serves the
# frontend). The seed is required: the auto-resolve worker looks up the admin
# and ai@example.com users at startup. Needs SEED_ADMIN_EMAIL + SEED_ADMIN_PASSWORD.
# DATABASE_URL and other secrets are injected by Railway at runtime.
CMD ["sh", "-c", \
     "cd backend && \
      bun /app/node_modules/.bun/node_modules/prisma/build/index.js migrate deploy && \
      bun prisma/seed.ts && \
      bun src/index.ts"]
