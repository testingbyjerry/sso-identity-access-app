# syntax=docker/dockerfile:1
# ------------------------------------------------------------------------------
# Production Multi-Stage Dockerfile for React SPA Frontend (@sso/web)
# ------------------------------------------------------------------------------

# Stage 1: Build & Bundle
FROM node:20-alpine AS builder

WORKDIR /app

RUN apk add --no-cache libc6-compat

# Enable Corepack & pnpm
RUN corepack enable && corepack prepare pnpm@12.21.0 --activate

# Copy monorepo configuration
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/config/package.json ./packages/config/
COPY packages/shared/package.json ./packages/shared/
COPY packages/validation/package.json ./packages/validation/
COPY apps/web/package.json ./apps/web/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source trees
COPY packages/config/ ./packages/config/
COPY packages/shared/ ./packages/shared/
COPY packages/validation/ ./packages/validation/
COPY apps/web/ ./apps/web/

# Build shared packages and frontend bundle
RUN pnpm --filter @sso/config run build
RUN pnpm --filter @sso/shared run build
RUN pnpm --filter @sso/validation run build

# Inject build-time environment variable for API URL (defaults to /api/v1 for reverse-proxy routing)
ARG VITE_API_URL=/api/v1
ENV VITE_API_URL=$VITE_API_URL

RUN pnpm --filter @sso/web run build

# Stage 2: Production Nginx Runtime
FROM nginx:1.25-alpine AS runner

RUN apk add --no-cache curl

# Copy custom nginx configuration
COPY apps/web/nginx.conf /etc/nginx/nginx.conf

# Copy compiled static assets from builder stage
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

# Expose HTTP port
EXPOSE 80

# Health check
HEALTHCHECK --interval=15s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://localhost/healthz || exit 1

CMD ["nginx", "-g", "daemon off;"]
