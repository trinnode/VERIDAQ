# ─────────────────────────────────────────────────────────────────────────────
# packages/api/Dockerfile
#
# Multi-stage build.  The builder stage compiles TypeScript, the runner stage
# only has the built JS and production node_modules.
# ─────────────────────────────────────────────────────────────────────────────

FROM node:22-alpine AS builder

# pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy workspace manifests first (better layer caching)
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/shared/package.json       ./packages/shared/
COPY packages/api/package.json          ./packages/api/

# Install all workspace deps
RUN pnpm install --frozen-lockfile

# Copy source
COPY packages/shared/   ./packages/shared/
COPY packages/api/      ./packages/api/

# Build shared first, then api
RUN pnpm --filter @veridaq/shared build 2>/dev/null || true
RUN pnpm --filter @veridaq/api    build

# ─────────────────────────────────────────────────────────────────────────────

FROM node:22-alpine AS runner

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy manifests for production install
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/shared/package.json       ./packages/shared/
COPY packages/api/package.json          ./packages/api/

# Production deps only (no devDependencies)
RUN pnpm install --frozen-lockfile --prod

# Copy built artifacts
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/api/dist    ./packages/api/dist

# Prisma client is generated during build — copy it
COPY --from=builder /app/node_modules/.prisma   ./node_modules/.prisma
COPY --from=builder /app/packages/api/prisma    ./packages/api/prisma

# circuit artifacts are volume-mounted at runtime via CIRCUIT_WASM_PATH etc

WORKDIR /app/packages/api

EXPOSE 3001

# Run migrations then start the server
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
