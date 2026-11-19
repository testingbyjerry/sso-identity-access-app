import { CheckCircle2, Server, Database, Boxes, Code2, RefreshCw } from 'lucide-react';
import { useSystemHealth, useSystemReadiness } from '../api/health.js';
import { Badge } from '../components/ui/badge.js';
import { Button } from '../components/ui/button.js';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/ui/card.js';

export function LandingPage() {
  const {
    data: health,
    isLoading: isHealthLoading,
    isError: isHealthError,
    refetch: refetchHealth,
  } = useSystemHealth();

  const {
    data: readiness,
    isLoading: isReadinessLoading,
    isError: isReadinessError,
    refetch: refetchReadiness,
  } = useSystemReadiness();

  const techStack = [
    { name: 'React 18 + Vite', category: 'Frontend', desc: 'Fast client SPA with ESM' },
    { name: 'Tailwind + shadcn/ui', category: 'Styling', desc: 'Modern accessible design tokens' },
    {
      name: 'Fastify + TypeScript',
      category: 'Backend',
      desc: 'High-performance Node.js REST API',
    },
    {
      name: 'PostgreSQL + Drizzle',
      category: 'Database',
      desc: 'Type-safe SQL ORM and schema layer',
    },
    {
      name: 'TanStack Query + Zustand',
      category: 'State',
      desc: 'Async server state and client store',
    },
    {
      name: 'Zod + OpenAPI 3.1',
      category: 'Contract',
      desc: 'End-to-end type validation & Swagger docs',
    },
  ];

  const packages = [
    { name: 'apps/web', desc: 'Client application shell, authentication UI, and tenant console' },
    { name: 'apps/api', desc: 'Fastify REST modular monolith with OpenAPI and health probes' },
    {
      name: 'packages/database',
      desc: 'Drizzle ORM schema, pooling client, and PostgreSQL migrations',
    },
    {
      name: 'packages/shared',
      desc: 'Shared TypeScript types, domain error classes, and constants',
    },
    { name: 'packages/validation', desc: 'Zod schemas for cross-tier data validation' },
    { name: 'packages/config', desc: 'Validated environment variables and runtime settings' },
  ];

  return (
    <div className="space-y-10">
      {/* Hero Section */}
      <section className="text-center space-y-4 max-w-3xl mx-auto pt-4">
        <Badge variant="outline" className="px-3 py-1 text-xs uppercase tracking-wider">
          Phase 1 Complete — Foundation &amp; Monorepo
        </Badge>
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">
          Multi-Tenant SSO &amp; Identity Access Management
        </h1>
        <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
          Production-oriented foundation built with a modular monolith architecture. Empowering
          enterprises to manage members, roles, identity providers, and SAML/OIDC federations.
        </p>
      </section>

      {/* Live System Diagnostics / Verification Cards */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Liveness Check Card */}
        <Card className="relative overflow-hidden border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <div className="space-y-1">
              <CardTitle className="text-base font-semibold flex items-center space-x-2">
                <Server className="h-4 w-4 text-primary" />
                <span>API Liveness Probe (`/api/v1/health`)</span>
              </CardTitle>
              <CardDescription>Verifies API server process health and uptime</CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refetchHealth()}
              className="h-8 w-8 p-0"
              title="Refresh Health"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">HTTP Status:</span>
              {isHealthLoading ? (
                <Badge variant="secondary">Checking...</Badge>
              ) : isHealthError ? (
                <Badge variant="destructive">Connection Failed</Badge>
              ) : (
                <Badge variant="success">200 OK — Healthy</Badge>
              )}
            </div>

            {health && (
              <div className="rounded-lg bg-muted/60 p-3 font-mono text-xs space-y-1 border border-border/50">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {health.status}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Environment:</span>
                  <span>{health.environment}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">API Version:</span>
                  <span>{health.version}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Uptime:</span>
                  <span>{Math.round(health.uptime)} seconds</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Readiness Check Card */}
        <Card className="relative overflow-hidden border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <div className="space-y-1">
              <CardTitle className="text-base font-semibold flex items-center space-x-2">
                <Database className="h-4 w-4 text-primary" />
                <span>Readiness Probe (`/api/v1/ready`)</span>
              </CardTitle>
              <CardDescription>Verifies database connectivity and infrastructure</CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refetchReadiness()}
              className="h-8 w-8 p-0"
              title="Refresh Readiness"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">PostgreSQL Status:</span>
              {isReadinessLoading ? (
                <Badge variant="secondary">Checking...</Badge>
              ) : isReadinessError ? (
                <Badge variant="destructive">Unavailable</Badge>
              ) : readiness?.checks.database.status === 'connected' ? (
                <Badge variant="success">Connected ({readiness.checks.database.latencyMs}ms)</Badge>
              ) : (
                <Badge variant="secondary">Standby (Docker offline)</Badge>
              )}
            </div>

            {readiness && (
              <div className="rounded-lg bg-muted/60 p-3 font-mono text-xs space-y-1 border border-border/50">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Overall Status:</span>
                  <span className="font-semibold">{readiness.status}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Database:</span>
                  <span>{readiness.checks.database.status}</span>
                </div>
                {readiness.checks.database.latencyMs !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Query Latency:</span>
                    <span>{readiness.checks.database.latencyMs} ms</span>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Monorepo Architecture Overview */}
      <section className="space-y-4">
        <div className="flex items-center space-x-2">
          <Boxes className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold tracking-tight">Monorepo Workspace Packages</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {packages.map((pkg) => (
            <Card
              key={pkg.name}
              className="border-border/70 hover:border-primary/50 transition-colors"
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="font-mono text-sm font-semibold">{pkg.name}</CardTitle>
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">{pkg.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Technology Stack Grid */}
      <section className="space-y-4">
        <div className="flex items-center space-x-2">
          <Code2 className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold tracking-tight">Standard Technology Stack</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {techStack.map((tech) => (
            <div
              key={tech.name}
              className="rounded-lg border border-border bg-card p-4 space-y-1 hover:shadow-sm transition-shadow"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm">{tech.name}</span>
                <span className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground bg-muted px-2 py-0.5 rounded">
                  {tech.category}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">{tech.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
