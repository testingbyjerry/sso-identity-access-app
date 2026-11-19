import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { CheckCircle2, KeyRound, Mail, Send } from 'lucide-react';
import { forgotPasswordSchema, ForgotPasswordInput } from '@sso/validation';
import { authApi } from '../../features/auth/auth.api.js';
import { Alert } from '../../components/ui/alert.js';
import { Button } from '../../components/ui/button.js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card.js';
import { Input } from '../../components/ui/input.js';

export function ForgotPasswordPage() {
  const [submitted, setSubmitted] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (data: ForgotPasswordInput) => {
    setError(null);
    try {
      await authApi.forgotPassword(data);
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Failed to submit password recovery request.');
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-10rem)] items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg border-border">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary mb-2">
            <KeyRound className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Password Recovery</CardTitle>
          <CardDescription className="text-xs">
            Enter your work email address to receive a secure, single-use password reset link
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive" title="Request Failed">
              {error}
            </Alert>
          )}

          {submitted ? (
            <div className="space-y-4 py-4 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h3 className="text-base font-semibold text-foreground">Recovery Request Submitted</h3>
              <p className="text-xs text-muted-foreground leading-relaxed max-w-sm mx-auto">
                If an account exists with that email address, a single-use password reset link has
                been generated and dispatched.
              </p>
              <div className="pt-2">
                <Link to="/login">
                  <Button variant="outline" className="w-full">
                    Return to Sign In
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <Input
                label="Work Email"
                type="email"
                placeholder="alice@acme.com"
                leftIcon={<Mail className="h-4 w-4" />}
                {...register('email')}
                error={errors.email?.message}
                autoFocus
              />

              <Button type="submit" className="w-full space-x-2" disabled={isSubmitting}>
                <Send className="h-4 w-4" />
                <span>{isSubmitting ? 'Submitting...' : 'Send Recovery Link'}</span>
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
