import * as React from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CheckCircle2, KeyRound, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { authApi } from '../../features/auth/auth.api.js';
import { Alert } from '../../components/ui/alert.js';
import { Button } from '../../components/ui/button.js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card.js';
import { Input } from '../../components/ui/input.js';

const clientResetPasswordSchema = z
  .object({
    password: z.string().min(8, 'Password must be at least 8 characters long'),
    confirmPassword: z.string().min(8, 'Please confirm your new password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type ClientResetPasswordForm = z.infer<typeof clientResetPasswordSchema>;

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);
  const [apiError, setApiError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ClientResetPasswordForm>({
    resolver: zodResolver(clientResetPasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (data: ClientResetPasswordForm) => {
    if (!token) {
      setApiError('Missing or invalid reset token. Please request a new recovery link.');
      return;
    }

    setApiError(null);
    try {
      await authApi.resetPassword({
        token,
        newPassword: data.password,
      });
      setSubmitted(true);
    } catch (err: any) {
      setApiError(err.message || 'Failed to reset password. The token may have expired or already been used.');
    }
  };

  if (!token) {
    return (
      <div className="flex min-h-[calc(100vh-10rem)] items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-lg border-border">
          <CardHeader className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/10 text-destructive mb-2">
              <AlertCircle className="h-6 w-6" />
            </div>
            <CardTitle className="text-xl font-bold">Invalid Reset Link</CardTitle>
            <CardDescription className="text-xs">
              This password reset link is invalid or has an omitted security token.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="text-xs text-muted-foreground">
              Please request a new password recovery link from the sign-in portal.
            </p>
            <Link to="/forgot-password">
              <Button className="w-full">Request New Link</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-10rem)] items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg border-border">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary mb-2">
            <KeyRound className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Set New Password</CardTitle>
          <CardDescription className="text-xs">
            Create a secure password with at least 8 characters
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {apiError && (
            <Alert variant="destructive" title="Reset Failed">
              {apiError}
            </Alert>
          )}

          {submitted ? (
            <div className="space-y-4 py-4 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h3 className="text-base font-semibold text-foreground">Password Successfully Reset</h3>
              <p className="text-xs text-muted-foreground leading-relaxed max-w-sm mx-auto">
                Your password has been securely updated and all previous sessions have been invalidated.
                You may now sign in with your new credentials.
              </p>
              <div className="pt-2">
                <Button className="w-full" onClick={() => navigate('/login')}>
                  Proceed to Sign In
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <Input
                label="New Password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••••••"
                leftIcon={<Lock className="h-4 w-4" />}
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-muted-foreground hover:text-foreground focus:outline-none"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                }
                {...register('password')}
                error={errors.password?.message}
                autoFocus
              />

              <Input
                label="Confirm New Password"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="••••••••••••"
                leftIcon={<Lock className="h-4 w-4" />}
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="text-muted-foreground hover:text-foreground focus:outline-none"
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                }
                {...register('confirmPassword')}
                error={errors.confirmPassword?.message}
              />

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? 'Updating Password...' : 'Reset Password'}
              </Button>

              <div className="pt-2 text-center">
                <Link
                  to="/login"
                  className="text-xs font-medium text-muted-foreground hover:text-foreground"
                >
                  ← Back to Sign In
                </Link>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
