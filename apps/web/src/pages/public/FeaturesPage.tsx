import {
  CheckCircle2,
  Database,
  FileText,
  KeyRound,
  Lock,
  RefreshCw,
  UserCheck,
} from 'lucide-react';
import { Badge } from '../../components/ui/badge.js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card.js';

export function FeaturesPage() {
  const featureList = [
    {
      icon: KeyRound,
      title: 'Enterprise SSO Protocols',
      description:
        'Standards-compliant OIDC and SAML 2.0 federation with Microsoft Entra ID, Okta, Google, and custom corporate identity providers.',
      details: [
        'OpenID Connect Discovery (/.well-known/openid-configuration)',
        'RFC 7636 PKCE S256 code challenge & verifier',
        'State and nonce validation for replay protection',
        'Cryptographic JWKS signature validation via jose',
      ],
    },
    {
      icon: UserCheck,
      title: 'Just-In-Time (JIT) Provisioning',
      description:
        'Eliminate manual onboarding. Automatically provision user accounts and link identities upon verified enterprise login.',
      details: [
        'Automatic profile attribute mapping (email, name, sub/oid)',
        'Composite foreign key identity provider linking',
        'Configurable default tenant role assignment',
        'Directory sync compatibility',
      ],
    },
    {
      icon: Database,
      title: 'PostgreSQL Row-Level Security',
      description:
        'Tenant data is isolated at the database engine layer. Every query runs inside a transaction-scoped tenant boundary.',
      details: [
        'ENABLE & FORCE ROW LEVEL SECURITY on all tenant tables',
        'Transaction-local set_config isolation (SET LOCAL)',
        'Zero context leakage across connection pool reuse',
        'Dedicated non-superuser sso_app_user runtime role',
      ],
    },
    {
      icon: Lock,
      title: 'Argon2id & AES-256-GCM Cryptography',
      description:
        'Highest-grade cryptographic hygiene applied to credentials, session secrets, and enterprise provider configurations.',
      details: [
        'Argon2id password hashing with OWASP parameters',
        'Authenticated AES-256-GCM encryption for provider secrets',
        'Write-only client secret redaction in API outputs',
        'SHA-256 session token hashing in PostgreSQL',
      ],
    },
    {
      icon: RefreshCw,
      title: 'Seamless Organization Switching',
      description:
        'Users can participate in multiple organizations with different privileges without duplicating global credentials.',
      details: [
        'Strict server-side membership validation before switching',
        'Session token rotation upon organization switch',
        'Permission re-evaluation on tenant context change',
        'Protection against client-side tenant tampering',
      ],
    },
    {
      icon: FileText,
      title: 'Immutable Security Audit Trail',
      description:
        'Audit-ready event logging for every authentication event, permission change, provider update, and tenant operation.',
      details: [
        'Actor user ID, IP address, and user agent recording',
        'Structured event metadata with zero plaintext secrets',
        'Tenant-scoped querying with search and pagination',
        'Tamper-evident append-only log structure',
      ],
    },
  ];

  return (
    <div className="container mx-auto px-4 sm:px-6 py-12 md:py-16 space-y-12">
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <Badge variant="outline" className="px-3 py-1 text-xs border-primary/30 text-primary">
          Platform Architecture & Capabilities
        </Badge>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-foreground">
          Enterprise Security Built Into Every Layer
        </h1>
        <p className="text-base text-muted-foreground leading-relaxed">
          Engineered as a modular monolith in TypeScript, Fastify, and PostgreSQL. Review the
          security capabilities powering your organization's authentication infrastructure.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {featureList.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.title} className="flex flex-col justify-between">
              <CardHeader>
                <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-3">
                  <Icon className="h-5 w-5" />
                </div>
                <CardTitle className="text-lg">{item.title}</CardTitle>
                <CardDescription className="text-xs leading-relaxed">{item.description}</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <ul className="space-y-2 text-xs text-muted-foreground border-t border-border pt-4">
                  {item.details.map((detail) => (
                    <li key={detail} className="flex items-start space-x-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-primary mt-0.5 flex-shrink-0" />
                      <span>{detail}</span>
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

