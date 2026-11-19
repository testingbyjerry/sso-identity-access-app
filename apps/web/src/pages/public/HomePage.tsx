import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  Database,
  KeyRound,
  Lock,
  Server,
  Users,
} from 'lucide-react';
import { Badge } from '../../components/ui/badge.js';
import { Button } from '../../components/ui/button.js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card.js';

export function HomePage() {
  return (
    <div className="space-y-24 py-12 md:py-20">
      {/* Hero Section */}
      <section className="container mx-auto px-4 sm:px-6 text-center space-y-6 max-w-4xl">
        <Badge variant="outline" className="px-3 py-1 text-xs border-primary/30 text-primary">
          Production-Ready Architecture · Phase 4
        </Badge>

        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl text-foreground">
          Enterprise Single Sign-On & <br />
          <span className="bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
            Multi-Tenant Identity Management
          </span>
        </h1>

        <p className="mx-auto max-w-2xl text-base sm:text-lg text-muted-foreground leading-relaxed">
          Centralize identity access, enforce fine-grained role-based access control, and federate
          with enterprise providers including Microsoft Entra ID and Okta with PostgreSQL Row-Level Security.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <Link to="/login/sso">
            <Button size="lg" className="w-full sm:w-auto space-x-2">
              <span>Enterprise SSO Login</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link to="/login">
            <Button variant="outline" size="lg" className="w-full sm:w-auto">
              Email / Password Sign In
            </Button>
          </Link>
        </div>

        {/* Feature Pills */}
        <div className="pt-8 flex flex-wrap items-center justify-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center space-x-1.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <span>Argon2id Hashing</span>
          </span>
          <span className="flex items-center space-x-1.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <span>OIDC Code + PKCE (S256)</span>
          </span>
          <span className="flex items-center space-x-1.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <span>PostgreSQL RLS</span>
          </span>
          <span className="flex items-center space-x-1.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <span>AES-256-GCM Encryption</span>
          </span>
        </div>
      </section>

      {/* Interactive Core Capabilities Grid */}
      <section className="container mx-auto px-4 sm:px-6">
        <div className="text-center space-y-3 mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Built for Modern Enterprise SaaS Requirements
          </h2>
          <p className="text-sm text-muted-foreground max-w-xl mx-auto">
            Everything your customers demand: independent identity configurations, custom domains,
            strict tenant boundaries, and audit logging.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <div className="h-10 w-10 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-2">
                <KeyRound className="h-5 w-5" />
              </div>
              <CardTitle>Enterprise Identity Federation</CardTitle>
              <CardDescription>
                Pre-configured adapter support for Microsoft Entra ID (Azure AD), Okta, Google Workspace,
                and custom OIDC identity providers with cryptographic JWKS verification.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground space-y-2">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                <span>Just-In-Time (JIT) member provisioning</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                <span>State & nonce replay prevention</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                <span>Write-only client secret redaction</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="h-10 w-10 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-2">
                <Database className="h-5 w-5" />
              </div>
              <CardTitle>PostgreSQL Row-Level Security</CardTitle>
              <CardDescription>
                Strict multi-tenant data isolation enforced directly at the database engine level.
                Composite foreign keys guarantee zero cross-tenant entity linking.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground space-y-2">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                <span>Transaction-local isolation (`SET LOCAL`)</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                <span>Connection pool leakage protection</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                <span>Dedicated application runtime role</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="h-10 w-10 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-2">
                <Users className="h-5 w-5" />
              </div>
              <CardTitle>Multi-Tenant Organization Switcher</CardTitle>
              <CardDescription>
                A single global user account can belong to multiple independent organizations with
                custom roles and permissions in each organization.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground space-y-2">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                <span>Session token rotation on org switch</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                <span>Strict membership re-validation</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                <span>Granular permission checks (RBAC)</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Security Architecture Callout */}
      <section className="container mx-auto px-4 sm:px-6">
        <div className="rounded-2xl border border-border bg-card p-8 sm:p-12 shadow-sm">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div className="space-y-4">
              <Badge variant="secondary" className="text-xs">Security-First Engineering</Badge>
              <h3 className="text-2xl sm:text-3xl font-bold tracking-tight">
                Cryptographic Credentials & Zero Storage of Plaintext Secrets
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Tokens are generated using cryptographically secure sources and hashed using SHA-256
                before database persistence. Password recovery tokens are single-use with automatic
                session invalidation. Enterprise client secrets are encrypted with AES-256-GCM.
              </p>
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2 font-semibold text-sm">
                    <Lock className="h-4 w-4 text-primary" />
                    <span>HttpOnly Sessions</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Stored in signed, SameSite=Lax cookies, completely inaccessible to JavaScript.
                  </p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center space-x-2 font-semibold text-sm">
                    <Server className="h-4 w-4 text-primary" />
                    <span>Immutable Audit Log</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    All authentication and privilege events recorded with IP and actor details.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-background/80 p-6 font-mono text-xs space-y-3">
              <div className="text-muted-foreground pb-2 border-b border-border flex justify-between items-center">
                <span>security_architecture_spec.json</span>
                <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded">Verified</span>
              </div>
              <div className="space-y-1.5 text-muted-foreground">
                <p><span className="text-blue-500 font-semibold">password_hashing:</span> "Argon2id (m=64MB, t=3, p=1)"</p>
                <p><span className="text-blue-500 font-semibold">session_storage:</span> "Opaque tokens, SHA-256 DB hash"</p>
                <p><span className="text-blue-500 font-semibold">oidc_flow:</span> "Authorization Code + PKCE (S256)"</p>
                <p><span className="text-blue-500 font-semibold">provider_encryption:</span> "AES-256-GCM with 96-bit IV"</p>
                <p><span className="text-blue-500 font-semibold">tenant_isolation:</span> "PostgreSQL Row-Level Security"</p>
                <p><span className="text-blue-500 font-semibold">anti_csrf:</span> "Cookie-backed signed tokens"</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

