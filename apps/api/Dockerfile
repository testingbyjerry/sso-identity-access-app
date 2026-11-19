# syntax=docker/dockerfile:1
# ------------------------------------------------------------------------------
# Production Multi-Stage Dockerfile for Fastify API (@sso/api)
# ------------------------------------------------------------------------------

# Stage 1: Build & Dependencies
FROM node:20-alpine AS builder

WORKDIR /app

RUN apk add --no-cache libc6-compat python3 make g++

# Enable Corepack & pnpm
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

# Copy monorepo configuration
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/config/package.json ./packages/config/
COPY packages/shared/package.json ./packages/shared/
COPY packages/validation/package.json ./packages/validation/
COPY packages/database/package.json ./packages/database/
COPY apps/api/package.json ./apps/api/

# Install all dependencies (including devDependencies for build)
RUN pnpm install --frozen-lockfile

# Copy source trees
COPY packages/config/ ./packages/config/
COPY packages/shared/ ./packages/shared/
COPY packages/validation/ ./packages/validation/
COPY packages/database/ ./packages/database/
COPY apps/api/ ./apps/api/

# Build internal packages and API
RUN pnpm --filter @sso/config run build
RUN pnpm --filter @sso/shared run build
RUN pnpm --filter @sso/validation run build
RUN pnpm --filter @sso/database run build
RUN pnpm --filter @sso/api run build

# Deploy production-only pruned workspace
RUN pnpm --filter @sso/api --prod deploy /prod/api

# Stage 2: Minimal Production Runtime
FROM node:20-alpine AS runner

WORKDIR /app

# Install dumb-init for proper signal forwarding and PID 1 reaping
RUN apk add --no-cache dumb-init curl

ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

# Run container as unprivileged non-root user
USER node

# Copy built production deployment
COPY --chown=node:node --from=builder /prod/api ./

# Expose HTTP port
EXPOSE 3000

# Container healthcheck
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000/api/v1/health || exit 1

ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "dist/server.js"]
