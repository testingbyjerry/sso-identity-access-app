import * as React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Building2, CheckCircle2, Globe, KeyRound, Lock, Search } from 'lucide-react';
import { authApi } from '../../features/auth/auth.api.js';
import { Alert } from '../../components/ui/alert.js';
import { Badge } from '../../components/ui/badge.js';
import { Button } from '../../components/ui/button.js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card.js';
import { Input } from '../../components/ui/input.js';
import { Spinner } from '../../components/ui/loading.js';

interface DiscoveredIdp {
  id: string;
  name: string;
  slug: string;
  type: string;
  organizationId: string;
  domains: string[];
}

export function SsoLoginPage() {
  const [query, setQuery] = React.useState('');
  const [isDiscovering, setIsDiscovering] = React.useState(false);
  const [isInitiating, setIsInitiating] = React.useState(false);
  const [discoveredIdp, setDiscoveredIdp] = React.useState<DiscoveredIdp | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const handleDiscover = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setError(null);
    setDiscoveredIdp(null);
    setIsDiscovering(true);

    try {
      const res = await authApi.ssoDiscover(query.trim());
      setDiscoveredIdp(res.data);
    } catch (err: any) {
      setError(
        err.message ||
          'No enterprise SSO provider was found matching that domain or slug. Please contact your organization administrator.'
      );
    } finally {
      setIsDiscovering(false);
    }
  };

  const handleStartSso = async () => {
    if (!discoveredIdp) return;

    setError(null);
    setIsInitiating(true);

    try {
      const res = await authApi.ssoStart({
        providerId: discoveredIdp.id,
      });

      if (res.data?.authorizationUrl) {
        // Redirect to enterprise identity provider (Microsoft Entra ID / Okta)
        window.location.href = res.data.authorizationUrl;
      } else {
        throw new Error('Identity provider authorization URL could not be generated.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to initiate SSO transaction.');
      setIsInitiating(false);
    }
  };

  const getProviderBadge = (type: string) => {
    switch (type.toLowerCase()) {
      case 'microsoft':
        return <Badge variant="info">Microsoft Entra ID</Badge>;
      case 'okta':
        return <Badge variant="secondary">Okta SSO</Badge>;
      case 'oidc':
        return <Badge variant="outline">OpenID Connect</Badge>;
      default:
        return <Badge variant="outline">{type.toUpperCase()}</Badge>;
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-10rem)] items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg border-border">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary mb-2">
            <KeyRound className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Enterprise SSO</CardTitle>
          <CardDescription className="text-xs">
            Enter your company email or organization domain to discover your corporate Identity Provider
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive" title="SSO Discovery Failed">
              {error}
            </Alert>
          )}

          {!discoveredIdp ? (
            <form onSubmit={handleDiscover} className="space-y-4">
              <Input
                label="Corporate Email or Domain"
                placeholder="alice@acme.com or acme.com"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                leftIcon={<Globe className="h-4 w-4" />}
                helperText="We will look up your organization's configured SAML/OIDC provider."
                autoFocus
              />

              <Button
                type="submit"
                className="w-full space-x-2"
                disabled={isDiscovering || !query.trim()}
              >
                {isDiscovering ? (
                  <>
                    <Spinner className="h-4 w-4 mr-2" />
                    <span>Discovering Provider...</span>
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4" />
                    <span>Find SSO Provider</span>
                  </>
                )}
              </Button>
            </form>
          ) : (
            <div className="space-y-4 rounded-xl border border-border bg-card/60 p-4 animate-in fade-in-50">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Provider Detected
                  </span>
                  <h4 className="text-base font-bold text-foreground flex items-center space-x-1.5">
                    <Building2 className="h-4 w-4 text-primary" />
                    <span>{discoveredIdp.name}</span>
                  </h4>
                </div>
                {getProviderBadge(discoveredIdp.type)}
              </div>

              <div className="text-xs text-muted-foreground space-y-1 border-t border-border pt-3">
                <p className="flex items-center space-x-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  <span>PKCE S256 code challenge protection enabled</span>
                </p>
                <p className="flex items-center space-x-1.5">
                  <Lock className="h-3.5 w-3.5 text-emerald-500" />
                  <span>Cryptographic token verification active</span>
                </p>
              </div>

              <div className="pt-2 flex flex-col space-y-2">
                <Button
                  onClick={handleStartSso}
                  disabled={isInitiating}
                  className="w-full space-x-2"
                >
                  {isInitiating ? (
                    <>
                      <Spinner className="h-4 w-4 mr-2" />
                      <span>Redirecting to {discoveredIdp.name}...</span>
                    </>
                  ) : (
                    <>
                      <span>Continue to {discoveredIdp.name}</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDiscoveredIdp(null)}
                  disabled={isInitiating}
                >
                  Search with different domain
                </Button>
              </div>
            </div>
          )}

          <div className="pt-2 text-center">
            <Link
              to="/login"
              className="text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              ← Back to standard password login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
