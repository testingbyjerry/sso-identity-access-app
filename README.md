# Multi-Tenant SSO & Identity Access Management (IAM) SaaS Platform

> Production-ready, enterprise-grade multi-tenant Single Sign-On and Identity Access Management platform built as a high-assurance **modular monolith** with PostgreSQL Row-Level Security (RLS), OIDC federation with PKCE, and React 18 dashboard.

[![CI Pipeline](https://github.com/testingbyjerry/sso-identity-access-app/actions/workflows/ci.yml/badge.svg)](https://github.com/testingbyjerry/sso-identity-access-app/actions/workflows/ci.yml)
[![Node.js LTS](https://img.shields.io/badge/node->=20.x-brightgreen.svg)](https://nodejs.org/)
[![pnpm](https://img.shields.io/badge/pnpm-v9.x-orange.svg)](https://pnpm.io/)
[![PostgreSQL](https://img.shields.io/badge/postgresql-16-blue.svg)](https://www.postgresql.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## Architecture Overview

The system is structured as a **modular monolith** within a high-performance **pnpm monorepo**. Multiple organizations share a single database while maintaining strict, mathematically verified multi-tenant isolation through composite foreign keys, runtime tenant contexts, and PostgreSQL Row-Level Security (RLS).

```mermaid
flowchart TD
    subgraph Clients["Clients & Browsers"]
        Browser["User Browser / Client"]
        SPA["React 18 SPA (Vite + Tailwind + shadcn/ui)"]
    end

    subgraph Ingress["Ingress & Edge"]
        Nginx["Nginx Reverse Proxy (Port 80/443)<br/>• SPA Static Assets<br/>• Rate Limiting & TLS<br/>• Security Headers"]
    end

    subgraph Backend["Fastify Modular Monolith (@sso/api)"]
        PluginLayer["Plugin & Middleware Layer<br/>• Helmet Security Headers<br/>• CORS Strict Origin Check<br/>• Rate Limiting (Global & Route)<br/>• Cookie & CSRF Protection<br/>• Sensitive Log Redaction (Pino)"]
        
        AuthModule["Auth & Session Engine<br/>• Argon2id Password Hashing<br/>• Opaque Token Sessions<br/>• Session Rotation & Invalidation<br/>• OIDC Code Flow + PKCE (S256)"]
        
        TenantGuard["Tenant Context Resolver<br/>• Active Tenant Extraction<br/>• Membership Verification<br/>• Transactional RLS Pinning"]
        
        DomainModules["Domain Modules<br/>• Organizations Module<br/>• Members Module<br/>• Roles & Permissions (RBAC)<br/>• Identity Providers Module<br/>• Immutable Audit Logs Module"]
    end

    subgraph Database["PostgreSQL 16 Engine"]
        GlobalData["Platform Tables<br/>• organizations<br/>• users<br/>• permissions"]
        
        SessionData["Auth & State Tables<br/>• sessions<br/>• sso_transactions<br/>• password_reset_tokens"]
        
        subgraph RLSBoundary["Row-Level Security Boundary (sso_app_user)"]
            TenantData["Tenant-Owned Tables (app.current_tenant_id)<br/>• organization_members<br/>• roles<br/>• role_permissions (Composite FK)<br/>• member_roles (Dual Composite FK)<br/>• identity_providers (AES-256 Encrypted)<br/>• user_identities<br/>• invitations<br/>• audit_logs (Append-Only)"]
        end
    end

    subgraph ExternalIdPs["Federated Identity Providers"]
        EntraID["Microsoft Entra ID (Azure AD)<br/>OpenID Connect Discovery"]
        Okta["Okta SSO<br/>OpenID Connect Discovery"]
    end

    Browser --> SPA
    SPA -->|HTTP / REST| Nginx
    Nginx -->|Proxy /api/*| PluginLayer
    PluginLayer --> AuthModule
    AuthModule --> TenantGuard
    TenantGuard --> DomainModules
    
    AuthModule <-->|OIDC Auth Code + PKCE| ExternalIdPs
    
    TenantGuard -->|SET LOCAL app.current_tenant_id| Database
    DomainModules --> RLSBoundary
    AuthModule --> SessionData
    DomainModules --> GlobalData
```

---

## Monorepo Structure

```text
sso-identity-access-app/
├── apps/
│   ├── web/                     # React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui
│   │   ├── src/                 # Public marketing, auth flows, and authenticated dashboard
│   │   ├── e2e/                 # Playwright end-to-end integration test suites
│   │   ├── nginx.conf           # Production Nginx reverse-proxy configuration
│   │   └── Dockerfile           # Multi-stage production container for frontend SPA
│   │
│   └── api/                     # Fastify + TypeScript + Pino + OpenAPI 3.1
│       ├── src/
│       │   ├── app.ts           # Fastify application setup & plugins
│       │   ├── server.ts        # Server entrypoint and graceful shutdown lifecycle
│       │   ├── plugins/         # Security headers, CORS, rate limiting, RLS tenant context
│       │   ├── modules/         # Domain modules (auth, orgs, members, roles, idps, audit)
│       │   └── common/          # Interceptors, base errors, crypto utilities
│       ├── test/                # Unit, integration, security hardening & tenant isolation tests
│       └── Dockerfile           # Multi-stage production container with dumb-init & non-root user
│
├── packages/
│   ├── database/                # PostgreSQL connection pooling + Drizzle ORM + RLS migrations
│   │   ├── src/schema/          # Drizzle relational schemas & composite foreign key constraints
│   │   └── test/                # RLS enforcement and connection pool isolation test suite
│   ├── shared/                  # Common TypeScript interfaces, DTOs, domain error codes
│   ├── validation/              # Shared Zod schemas for request validation & DTO parsing
│   └── config/                  # Environment variable schema validation with Zod
│
├── .github/workflows/
│   └── ci.yml                   # GitHub Actions pipeline (lint, typecheck, tests, build)
├── docker-compose.yml           # Development PostgreSQL 16 container with health check
├── docker-compose.prod.yml      # Complete multi-container production stack (Postgres + API + Web)
├── pnpm-workspace.yaml          # Monorepo workspace configuration
├── tsconfig.base.json           # Shared strict TypeScript configuration
└── README.md
```

### Monorepo Packages Breakdown

| Workspace Package | Responsibility | Key Dependencies |
| :--- | :--- | :--- |
| `apps/web` | Enterprise web application (Marketing, Auth, Dashboard, SSO admin) | React 18, Vite, TanStack Query, React Hook Form, Tailwind CSS, Playwright |
| `apps/api` | Fastify backend API, OpenAPI 3.1 Swagger, authentication & SSO | Fastify, `@node-rs/argon2`, `jose`, `@fastify/helmet`, `@fastify/rate-limit`, Pino |
| `packages/database` | Database models, Drizzle migrations, connection pool, RLS policies | PostgreSQL 16, Drizzle ORM, `postgres.js` |
| `packages/shared` | Shared TypeScript domain types, DTO contracts, RBAC constants | TypeScript |
| `packages/validation` | Shared Zod schemas for API body, query, and parameter validation | Zod |
| `packages/config` | Strict environment variable parsing and configuration loading | Zod, `dotenv` |

---

## Multi-Tenant Isolation & Security Strategy

Our multi-tenant architecture implements **defense-in-depth** across 5 distinct enforcement layers:

```
[Layer 1] API Route PreHandler: Validates membership in active tenant
    ↓
[Layer 2] Tenant-Scoped Repositories: Injects organizationId into WHERE clauses
    ↓
[Layer 3] Composite Foreign Keys: Enforces relational tenant integrity at DB schema level
    ↓
[Layer 4] PostgreSQL Row-Level Security (RLS): Enforces isolation at query engine level
    ↓
[Layer 5] Transaction-Local Context: SET LOCAL guarantees zero leak across pooled connections
```

### 1. Composite Foreign Keys Guarantee Mathematical Isolation

Tenant-owned tables do not merely point to `member_id` or `role_id`; they enforce dual-column composite foreign keys that include `organization_id`:

```sql
-- Role permissions composite foreign key:
CONSTRAINT fk_role_permissions_role 
  FOREIGN KEY (organization_id, role_id) 
  REFERENCES roles(organization_id, id) ON DELETE CASCADE

-- Member roles dual-composite foreign key:
CONSTRAINT fk_member_roles_member 
  FOREIGN KEY (organization_id, member_id) 
  REFERENCES organization_members(organization_id, id) ON DELETE CASCADE,
CONSTRAINT fk_member_roles_role 
  FOREIGN KEY (organization_id, role_id) 
  REFERENCES roles(organization_id, id) ON DELETE CASCADE
```

> **Why this matters:** Even if an attacker compromises application code or executes arbitrary SQL, **it is mathematically impossible to assign Organization B's role to Organization A's member**. The database engine rejects the insert with a composite foreign key violation.

### 2. PostgreSQL Row-Level Security (RLS)

All tenant-owned tables have `ENABLE ROW LEVEL SECURITY` and `FORCE ROW LEVEL SECURITY`. Queries execute as an unprivileged database user (`sso_app_user`) that has `NOBYPASSRLS`:

```sql
CREATE POLICY tenant_isolation_policy ON organization_members
  AS RESTRICTIVE
  USING (organization_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
```

### 3. Connection-Pool Context Leak Prevention

When using connection poolers (e.g. PgBouncer or `postgres.js` pools), standard `SET app.current_tenant_id` can poison subsequent queries executed by different tenants on the same connection.

Our implementation uses **transaction-local settings**:

```typescript
// packages/database/src/client.ts
export async function withTenantContext<T>(
  tenantId: string,
  fn: (tx: DrizzleTransaction) => Promise<T>
): Promise<T> {
  return await db.transaction(async (tx) => {
    // The third parameter `true` sets LOCAL scope, automatically cleared at commit/abort
    await tx.execute(sql`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`);
    return await fn(tx);
  });
}
```

---

## Authentication & Enterprise SSO Engine

### 1. Email / Password Security
- **Argon2id**: Industry-standard password hashing with memory-hard parameters (19 MiB memory, 2 iterations, 1 parallelism thread).
- **Anti-Enumeration Protection**: Identical timing-resistant responses for both valid and invalid email addresses on login and password reset.
- **Single-Use Password Reset**: Opaque tokens stored as SHA-256 hashes with 1-hour expiration. Consuming a token immediately revokes all active sessions for that user.

### 2. Session Management
- **Opaque Token Hashes**: 32-byte cryptographically secure random session tokens; only SHA-256 hashes are stored in the database.
- **Cookie Security**: Signed `HttpOnly`, `SameSite=Lax`, `Secure` cookies (`sso_session`).
- **Session Rotation**: Cryptographic session tokens rotate automatically upon login, privilege elevation, and active organization switching.
- **Instant Revocation**: Users can inspect active devices, locations, and IPs, with one-click revocation of individual or all other sessions.

### 3. OIDC SSO with PKCE Architecture

```mermaid
sequenceDiagram
    autonumber
    actor User as Employee
    participant Web as React Web SPA
    participant API as Fastify API (@sso/api)
    participant DB as PostgreSQL 16
    participant IdP as Enterprise IdP (Entra / Okta)

    User->>Web: Enters work email (user@acme.com)
    Web->>API: GET /api/v1/auth/sso/discover?domain=acme.com
    API->>DB: Lookup enabled IdP for domain
    DB-->>API: Returns IdP Config (Entra ID)
    API-->>Web: Provider found (slug: acme-entra)

    User->>Web: Clicks "Sign In with SSO"
    Web->>API: POST /api/v1/auth/sso/start { providerSlug: "acme-entra" }
    Note over API: Generates state, nonce, and PKCE S256 code_verifier
    API->>DB: Store sso_transaction (state, nonce, code_verifier hash)
    API-->>Web: Redirect URL with client_id, state, nonce, code_challenge
    Web->>IdP: Redirect user to IdP login screen

    User->>IdP: Authenticates & completes MFA
    IdP-->>Web: Redirects to /auth/callback?code=AUTH_CODE&state=STATE
    Web->>API: GET /api/v1/auth/sso/callback?code=AUTH_CODE&state=STATE
    
    API->>DB: Validate & consume sso_transaction (replay prevention)
    API->>IdP: Exchange code + code_verifier for tokens (Backchannel POST)
    IdP-->>API: Returns ID Token (JWT) & Access Token
    
    Note over API: Validates JWT signature via IdP JWKS, issuer, audience, and nonce
    API->>DB: JIT Provision / Link User Identity (user_identities)
    API->>DB: Create session with rotated token
    API-->>Web: Set-Cookie: sso_session; HttpOnly; Secure
    Web->>User: Navigates to authenticated Organization Dashboard
```

### 4. AES-256-GCM Secret Encryption at Rest
All enterprise SSO client secrets (`clientSecret`) are encrypted before database insertion using authenticated `AES-256-GCM` encryption with a unique initialization vector (IV) per record. Client secrets are redacted (`********`) in all REST responses.

---

## Identity Provider Configuration Guides

### Microsoft Entra ID (Azure AD) Setup Guide

1. **Register Application in Microsoft Entra Admin Center**:
   - Navigate to **Identity** > **Applications** > **App registrations** > **New registration**.
   - Name: `SSO IAM Platform - Acme Tenant`.
   - Supported account types: *Accounts in this organizational directory only (Single tenant)* or *Multitenant*.
   - Redirect URI: Select **Web** and enter `https://<YOUR_APP_DOMAIN>/auth/callback` (or `http://localhost:5173/auth/callback` for development).
2. **Retrieve Credentials**:
   - Copy the **Application (client) ID**.
   - Copy the **Directory (tenant) ID**.
   - Navigate to **Certificates & secrets** > **New client secret**. Copy the secret **Value**.
3. **Configure Issuer & Endpoints**:
   - OIDC Issuer URL: `https://login.microsoftonline.com/<TENANT_ID>/v2.0`
4. **Configure in SSO IAM Dashboard**:
   - In your organization dashboard, navigate to **SSO Configuration** > **Add Entra ID Provider**.
   - Provide Provider Name (`Microsoft Entra ID Production`).
   - Enter Client ID, Client Secret, and Directory Tenant ID.
   - Assign corporate email domain (e.g. `acmecorp.com`).

---

### Okta SSO Setup Guide

1. **Create App Integration in Okta Admin Console**:
   - Navigate to **Applications** > **Applications** > **Create App Integration**.
   - Sign-in method: **OIDC - OpenID Connect**.
   - Application type: **Web Application**.
2. **Configure General Settings**:
   - App integration name: `SSO IAM Platform`.
   - Grant type: Check **Authorization Code**.
   - Sign-in redirect URIs: `https://<YOUR_APP_DOMAIN>/auth/callback` (or `http://localhost:5173/auth/callback`).
   - Controlled access: Assign to appropriate groups or users.
3. **Retrieve Credentials**:
   - Copy the generated **Client ID** and **Client secret**.
   - Issuer URL: `https://<YOUR_OKTA_DOMAIN>.okta.com` (e.g. `https://dev-12345.okta.com`).
4. **Configure in SSO IAM Dashboard**:
   - Navigate to **SSO Configuration** > **Add Okta / OIDC**.
   - Provide Provider Name (`Okta Enterprise Staging`).
   - Enter Issuer URL, Client ID, and Client Secret.
   - Enter corporate domain(s) for automatic domain discovery.

---

## Local Development Quickstart

### Prerequisites

- Node.js LTS (`>= 20.x`)
- pnpm (`>= 9.x`)
- Docker & Docker Compose

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/testingbyjerry/sso-identity-access-app.git
cd sso-identity-access-app

pnpm install
```

### 2. Environment Configuration

Copy the sample environment file:

```bash
cp .env.example .env
```

Ensure the default variables match your local environment:

```env
NODE_ENV=development
PORT=3000
HOST=0.0.0.0
LOG_LEVEL=debug
CORS_ORIGIN=http://localhost:5173

# PostgreSQL Connection
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=sso_iam
POSTGRES_HOST=localhost
POSTGRES_PORT=5433
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/sso_iam

# Cryptographic Keys (Min 32 bytes)
COOKIE_SECRET=local_dev_cookie_signing_secret_min_32_characters
ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
APP_URL=http://localhost:5173

# Rate Limiting
RATE_LIMIT_MAX=120
RATE_LIMIT_WINDOW=60000

# Frontend
VITE_API_URL=http://localhost:3000
```

### 3. Start Database & Run Migrations

```bash
# Start PostgreSQL 16 container
pnpm docker:up

# Apply Drizzle migrations and enforce PostgreSQL RLS policies
pnpm db:migrate

# Seed demo organizations (Acme Corp, Beta Technologies), roles, and admin users
pnpm db:seed
```

### 4. Start Development Applications

```bash
# Run both Fastify API and Vite Web concurrently with hot-reload
pnpm dev
```

The apps will be available at:
- **Frontend SPA**: `http://localhost:5173`
- **Fastify API**: `http://localhost:3000`
- **Interactive Swagger Documentation**: `http://localhost:3000/docs`

---

## Production Deployment with Docker

The platform includes production-hardened multi-stage Dockerfiles and a production compose manifest.

### Production Features
- **Unprivileged Non-Root Execution**: Runs as user `node` (API) and `nginx` (Web).
- **Process Supervision**: Uses `dumb-init` for proper signal handling (SIGTERM, SIGINT) and PID 1 zombie reaping.
- **Embedded Healthchecks**: Container-native health checks on `/api/v1/health` and `/healthz`.
- **Nginx Reverse Proxy**: Gzip compression, strict caching for static assets, and security headers.

### Starting the Production Stack

```bash
# Build and run complete production stack (Postgres + API + Web)
pnpm docker:prod:up

# Inspect running services
docker compose -f docker-compose.prod.yml ps

# Tail production logs
docker compose -f docker-compose.prod.yml logs -f api
```

The production application is served at `http://localhost` (Port 80).

To tear down the production stack:

```bash
pnpm docker:prod:down
```

---

## Testing Guide

The codebase includes comprehensive test coverage spanning unit, security hardening, tenant isolation, and Playwright end-to-end user journeys.

```bash
# Run all unit and integration tests across all workspaces
pnpm test

# Run type checking across all workspace packages
pnpm typecheck

# Run linter
pnpm lint

# Run Playwright End-to-End integration suite
pnpm test:e2e
```

### Test Suites Summary

1. **Security Hardening Suite (`apps/api/test/security-hardening.test.ts`)**:
   - Expired and revoked session token rejection.
   - One-time password reset token consumption and expiration.
   - Disabled SSO provider rejection on start and callback.
   - OIDC token signature, issuer, audience, and nonce mismatch rejection.
   - Anti-CSRF token verification.
2. **Tenant Isolation Hardening Suite (`apps/api/test/tenant-isolation-hardening.test.ts`)**:
   - Org A member unable to list or query Org B members, roles, or IdPs.
   - Cross-tenant update and delete attempts return 404 Not Found.
   - Cross-tenant role assignment rejection.
   - Switching to unauthorized organizations returns 403 Forbidden.
3. **Database RLS Suite (`packages/database/test/tenant-isolation.test.ts`)**:
   - Proves PostgreSQL RLS policy enforcement at the raw database level.
   - Proves zero tenant context leakage between pooled connections using `withTenantContext`.
4. **Playwright E2E Suite (`apps/web/e2e/e2e-complete-journey.spec.ts`)**:
   - Complete 11-step user journey:
     1. Open marketing website.
     2. Navigate to login.
     3. Authenticate with credentials.
     4. Access organization dashboard.
     5. Switch between organizations.
     6. View team members.
     7. Invite a new team member.
     8. Configure enterprise SSO provider.
     9. Inspect audit logs.
     10. Revoke an active session.
     11. Log out cleanly.

---

## Security Hardening Checklist

- [x] **Password Security**: Argon2id hashing with memory-hard parameters.
- [x] **Rate Limiting**: Global API rate limiting (120 req/min) + strict brute-force protection (5 req/min) on login, forgot-password, and reset-password.
- [x] **Session Security**: 32-byte opaque tokens, SHA-256 token hashing at rest, session rotation on auth and tenant switch, `HttpOnly`, `SameSite=Lax`, and `Secure` cookies.
- [x] **CSRF Protection**: Token-based anti-CSRF protection on mutation endpoints with `x-csrf-token` header validation.
- [x] **Log Redaction**: Pino logger redacts `req.headers.authorization`, `cookie`, `set-cookie`, `password`, `clientSecret`, `token`, and `codeVerifier`.
- [x] **Row-Level Security**: PostgreSQL RLS enabled and forced on all tenant tables with unprivileged `sso_app_user`.
- [x] **Secret Encryption**: AES-256-GCM encryption of third-party IdP secrets at rest.
- [x] **Security Headers**: Fastify Helmet & Nginx configured with HSTS, CSP, X-Frame-Options (`DENY`), X-Content-Type-Options (`nosniff`).
- [x] **Parameterized Queries**: All database queries executed through Drizzle ORM parameterized prepared statements.

---

## Known Limitations & Production Enhancements

- **SAML 2.0 Protocol**: Current release federates over OpenID Connect (OIDC) with PKCE. Organizations requiring XML-based SAML 2.0 assertions can integrate `@node-saml/passport-saml` or a dedicated SAML bridge.
- **SCIM 2.0 Provisioning**: JIT provisioning is implemented on first SSO sign-in. Full SCIM 2.0 inbound directory synchronization endpoints (`/scim/v2/Users`, `/scim/v2/Groups`) are scheduled for future roadmap phases.
- **Distributed Cache**: In single-instance deployment, Fastify in-memory rate limiting and token cache are used. For multi-instance clustered Kubernetes deployments, configure Redis with `@fastify/rate-limit` Redis store.

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
