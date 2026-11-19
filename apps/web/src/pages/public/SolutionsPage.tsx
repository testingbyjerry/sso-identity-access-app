import { Building, ShieldCheck, Cpu } from 'lucide-react';
import { Badge } from '../../components/ui/badge.js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card.js';

export function SolutionsPage() {
  const solutions = [
    {
      icon: Building,
      badge: 'B2B SaaS Platforms',
      title: 'Enterprise-Ready Multi-Tenancy',
      description:
        'Deliver native enterprise SSO to your enterprise customers on day one without complex bespoke integrations.',
      points: [
        'Each customer organization configures their own Identity Provider independently.',
        'Custom domain discovery allows users to type @customer.com and route to their IdP.',
        'Granular role-based access control with member invitation workflows.',
        'Self-service SSO connection testing with immediate configuration diagnostics.',
      ],
    },
    {
      icon: ShieldCheck,
      badge: 'Security & Compliance',
      title: 'High-Assurance Identity Governance',
      description:
        'Built for security engineers and auditors who require provable data boundaries and cryptographic guarantees.',
      points: [
        'PostgreSQL Row-Level Security ensures no query can accidentally query cross-tenant records.',
        'No long-lived access tokens or sensitive secrets stored in browser storage.',
        'Session revocation from any device with immediate server-side invalidation.',
        'Immutable audit logs record all identity access events with IP and actor traceability.',
      ],
    },
    {
      icon: Cpu,
      badge: 'Modern Engineering Teams',
      title: 'Modular Monolith Simplicity',
      description:
        'Avoid the operational fragility, distributed transactions, and network latency of microservices.',
      points: [
        'Clean domain modules (organizations, members, roles, identity providers, audit logs).',
        'Strict TypeScript compilation and shared schema validation across frontend and backend.',
        'Single transactional database engine with ACID safety for invitations and role bindings.',
        'Comprehensive automated Vitest and Playwright test coverage.',
      ],
    },
  ];

  return (
    <div className="container mx-auto px-4 sm:px-6 py-12 md:py-16 space-y-12">
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <Badge variant="outline" className="px-3 py-1 text-xs border-primary/30 text-primary">
          Engineered for Scale
        </Badge>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-foreground">
          Solutions for Enterprise Identity Access
        </h1>
        <p className="text-base text-muted-foreground leading-relaxed">
          Explore how our multi-tenant identity architecture solves enterprise federation,
          security isolation, and organizational governance.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {solutions.map((sol) => {
          const Icon = sol.icon;
          return (
            <Card key={sol.title} className="flex flex-col justify-between">
              <CardHeader>
                <div className="flex items-center justify-between mb-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <Icon className="h-5 w-5" />
                  </div>
                  <Badge variant="secondary" className="text-[11px]">{sol.badge}</Badge>
                </div>
                <CardTitle className="text-lg">{sol.title}</CardTitle>
                <CardDescription className="text-xs leading-relaxed">{sol.description}</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <ul className="space-y-2.5 text-xs text-muted-foreground border-t border-border pt-4">
                  {sol.points.map((pt) => (
                    <li key={pt} className="flex items-start space-x-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                      <span>{pt}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
