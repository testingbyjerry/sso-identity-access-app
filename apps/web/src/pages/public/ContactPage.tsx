import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CheckCircle2, Mail, Send } from 'lucide-react';
import { Badge } from '../../components/ui/badge.js';
import { Button } from '../../components/ui/button.js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card.js';
import { Input } from '../../components/ui/input.js';

const contactSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid work email address'),
  organization: z.string().min(2, 'Organization name is required'),
  inquiryType: z.enum(['sso_evaluation', 'security_question', 'custom_integration', 'general']),
  message: z.string().min(10, 'Message must be at least 10 characters'),
});

type ContactFormData = z.infer<typeof contactSchema>;

export function ContactPage() {
  const [submitted, setSubmitted] = React.useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      inquiryType: 'sso_evaluation',
    },
  });

  const onSubmit = async (_data: ContactFormData) => {
    // Simulated contact inquiry submission
    await new Promise((resolve) => setTimeout(resolve, 800));
    setSubmitted(true);
    reset();
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 py-12 md:py-16 max-w-2xl space-y-8">
      <div className="text-center space-y-3">
        <Badge variant="outline" className="px-3 py-1 text-xs border-primary/30 text-primary">
          Enterprise Inquiries
        </Badge>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
          Contact Our Identity Engineering Team
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Questions about OIDC federation, Microsoft Entra ID setups, or multi-tenant database security?
          Reach out directly to our engineering architects.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Mail className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Send an Inquiry</CardTitle>
          </div>
          <CardDescription className="text-xs">
            We respond to enterprise identity questions within one business day.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {submitted ? (
            <div className="space-y-4 py-6 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h3 className="text-base font-semibold text-foreground">Message Received</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Thank you for your inquiry. Our engineering team has received your request and will follow up shortly.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSubmitted(false)}
                className="mt-2"
              >
                Send Another Message
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Full Name"
                  placeholder="Jane Doe"
                  {...register('fullName')}
                  error={errors.fullName?.message}
                />
                <Input
                  label="Work Email"
                  type="email"
                  placeholder="jane@company.com"
                  {...register('email')}
                  error={errors.email?.message}
                />
              </div>

              <Input
                label="Organization / Company"
                placeholder="Acme Corp"
                {...register('organization')}
                error={errors.organization?.message}
              />

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Inquiry Topic
                </label>
                <select
                  {...register('inquiryType')}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="sso_evaluation">Enterprise SSO & Federation Architecture</option>
                  <option value="security_question">Database Isolation & RLS Inquiries</option>
                  <option value="custom_integration">Microsoft Entra ID / Okta Deployment</option>
                  <option value="general">General Platform Inquiry</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Message Details
                </label>
                <textarea
                  {...register('message')}
                  rows={4}
                  placeholder="Describe your identity access requirements or technical questions..."
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                {errors.message && (
                  <p className="text-xs font-medium text-destructive">{errors.message.message}</p>
                )}
              </div>

              <Button type="submit" className="w-full space-x-2" disabled={isSubmitting}>
                <Send className="h-4 w-4" />
                <span>{isSubmitting ? 'Sending...' : 'Submit Inquiry'}</span>
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

