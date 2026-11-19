import * as React from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, ShieldCheck } from 'lucide-react';
import { authApi } from '../../features/auth/auth.api.js';
import { useAuth } from '../../features/auth/useAuth.js';
import { Alert } from '../../components/ui/alert.js';
import { Button } from '../../components/ui/button.js';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card.js';
import { Spinner } from '../../components/ui/loading.js';

export function AuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refetchUser } = useAuth();

  const [status, setStatus] = React.useState<'processing' | 'success' | 'error'>('processing');
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');

    if (!code || !state) {
      setStatus('error');
      setErrorMessage('Missing required authorization code or state parameter from SSO callback.');
      return;
    }

    let isMounted = true;

    async function processCallback() {
      try {
        await authApi.ssoCallback({ code: code!, state: state! });
        if (isMounted) {
          setStatus('success');
          await refetchUser();
          setTimeout(() => {
            navigate('/dashboard', { replace: true });
          }, 800);
        }
      } catch (err: any) {
        if (isMounted) {
          setStatus('error');
          setErrorMessage(
            err.message ||
              'Failed to complete SSO authentication. The authorization code or state may have expired or already been consumed.'
          );
        }
      }
    }

    processCallback();

    return () => {
      isMounted = false;
    };
  }, [searchParams, navigate, refetchUser]);

  return (
    <div className="flex min-h-[calc(100vh-10rem)] items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg border-border text-center">
        <CardHeader>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary mb-2">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <CardTitle className="text-xl font-bold tracking-tight">SSO Authentication</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 py-4">
          {status === 'processing' && (
            <div className="space-y-3">
              <Spinner className="h-8 w-8 mx-auto text-primary" />
              <p className="text-sm font-medium text-foreground">
                Verifying cryptographic ID token & establishing session...
              </p>
              <p className="text-xs text-muted-foreground">
                Exchanging PKCE code verifier and validating signatures.
              </p>
            </div>
          )}

          {status === 'success' && (
            <div className="space-y-3">
              <CheckCircle2 className="h-8 w-8 mx-auto text-emerald-500 animate-in zoom-in-50" />
              <p className="text-sm font-semibold text-foreground">Authentication Successful!</p>
              <p className="text-xs text-muted-foreground">Redirecting to your organization dashboard...</p>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-4">
              <Alert variant="destructive" title="Authentication Error">
                {errorMessage}
              </Alert>
              <Link to="/login">
                <Button className="w-full">Return to Sign In</Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

