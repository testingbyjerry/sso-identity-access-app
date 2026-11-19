import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, KeyRound, Lock, LogIn, Mail, ShieldCheck } from 'lucide-react';
import { loginSchema, LoginInput } from '@sso/validation';
import { useAuth } from '../../features/auth/useAuth.js';
import { authApi } from '../../features/auth/auth.api.js';
import { Alert } from '../../components/ui/alert.js';
import { Button } from '../../components/ui/button.js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card.js';
import { Input } from '../../components/ui/input.js';

export function LoginPage() {
  const [showPassword, setShowPassword] = React.useState(false);
  const [authError, setAuthError] = React.useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { refetchUser } = useAuth();

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard';

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginInput) => {
    setAuthError(null);
    try {
      await authApi.login(data);
      await refetchUser();
      navigate(from, { replace: true });
    } catch (err: any) {
      setAuthError(err.message || 'Invalid email or password. Please try again.');
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-10rem)] items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg border-border">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary mb-2">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Sign In</CardTitle>
          <CardDescription className="text-xs">
            Enter your credentials to access your organization portal
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {authError && (
            <Alert variant="destructive" title="Authentication Failed">
              {authError}
            </Alert>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Work Email"
              type="email"
              placeholder="alice@acme.com"
              autoComplete="email"
              leftIcon={<Mail className="h-4 w-4" />}
              {...register('email')}
              error={errors.email?.message}
            />

            <div className="space-y-1">
              <Input
                label="Password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••••••"
                autoComplete="current-password"
                leftIcon={<Lock className="h-4 w-4" />}
                rightElement={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-muted-foreground hover:text-foreground focus:outline-none"
                    tabIndex={-1}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                }
                {...register('password')}
                error={errors.password?.message}
              />
              <div className="flex justify-end pt-1">
                <Link
                  to="/forgot-password"
                  className="text-xs font-medium text-primary hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
            </div>

            <Button type="submit" className="w-full space-x-2" disabled={isSubmitting}>
              <LogIn className="h-4 w-4" />
              <span>{isSubmitting ? 'Signing in...' : 'Sign In with Password'}</span>
            </Button>
          </form>

          {/* Divider */}
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground font-semibold">Or continue with</span>
            </div>
          </div>

          {/* Enterprise SSO Option */}
          <Link to="/login/sso" className="block w-full">
            <Button variant="outline" className="w-full space-x-2" type="button">
              <KeyRound className="h-4 w-4 text-primary" />
              <span>Single Sign-On (SSO)</span>
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
