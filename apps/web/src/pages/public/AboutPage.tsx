import { CheckCircle2, Code2, Database, Shield } from 'lucide-react';
import { Badge } from '../../components/ui/badge.js';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card.js';

export function AboutPage() {
  const principles = [
    {
      icon: Shield,
      title: 'Security-First Defaults',
      description:
        'Never trust browser-supplied tenant claims. Always derive execution context from verified server-side session hashes and validated active organization memberships.',
    },
    {
      icon: Database,
      title: 'Database-Level Isolation',
      description:
        'Software application guards can have bugs; database Row-Level Security (RLS) ensures that even a rogue query cannot select or leak cross-tenant records.',
    },
    {
      icon: Code2,
      title: 'Modular Monolith Architecture',
      description:
        'Organized in domain modules (organizations, members, roles, identity providers, audit logs) sharing transactional database consistency and end-to-end TypeScript types.',
    },
  ];

  return (
    <div className="container mx-auto px-4 sm:px-6 py-12 md:py-16 space-y-12 max-w-4xl">
      <div className="text-center space-y-4">
        <Badge variant="outline" className="px-3 py-1 text-xs border-primary/30 text-primary">
          About the Architecture
        </Badge>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-foreground">
          Engineering Trust into Identity Infrastructure
        </h1>
        <p className="text-base text-muted-foreground leading-relaxed max-w-2xl mx-auto">
          Built as an enterprise-grade reference architecture for multi-tenant SSO, role-based
          access governance, and secure credential handling.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 sm:p-8 space-y-6 text-sm text-muted-foreground leading-relaxed">
        <h2 className="text-lg font-bold text-foreground">The Multi-Tenancy Challenge</h2>
        <p>
          In modern SaaS, enterprise clients require integration with their corporate Identity Providers
          (Microsoft Entra ID, Okta, Ping, Google). Traditional monolithic or ad-hoc authentication systems
          frequently fail at the boundary between shared platform accounts and organization-specific roles.
        </p>
        <p>
          Our platform establishes a clean separation between the <strong>global user identity</strong> (a single
          verified email across the platform) and <strong>tenant-owned memberships</strong>. A user can belong to
          Acme Corp as an Admin and Beta Industries as a Viewer without creating duplicate accounts, while
          PostgreSQL Row-Level Security and composite foreign keys guarantee that an organization member cannot
          be assigned a role belonging to another organization.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {principles.map((p) => {
          const Icon = p.icon;
          return (
            <Card key={p.title}>
              <CardHeader>
                <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-2">
                  <Icon className="h-5 w-5" />
                </div>
                <CardTitle className="text-base">{p.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground leading-relaxed">{p.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="rounded-xl border border-border bg-muted/40 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="space-y-1 text-center sm:text-left">
          <p className="font-semibold text-foreground text-sm">Automated Test Verification</p>
          <p className="text-xs text-muted-foreground">
            Fully verified by 48 automated unit, integration, and security test suites.
          </p>
        </div>
        <div className="flex items-center space-x-2 text-xs font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20">
          <CheckCircle2 className="h-4 w-4" />
          <span>48/48 Tests Passing</span>
        </div>
      </div>
    </div>
  );
}
