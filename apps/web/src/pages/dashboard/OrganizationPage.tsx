import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Building2, Globe, Shield, Save, Database } from 'lucide-react';
import { updateOrganizationSchema, UpdateOrganizationInput } from '@sso/validation';
import { useAuth } from '../../features/auth/useAuth.js';
import { organizationsApi } from '../../features/organizations/organizations.api.js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '../../components/ui/card.js';
import { Button } from '../../components/ui/button.js';
import { Input } from '../../components/ui/input.js';
import { Badge } from '../../components/ui/badge.js';
import { Alert } from '../../components/ui/alert.js';
import { PageLoader } from '../../components/ui/loading.js';

export function OrganizationPage() {
  const { activeOrganization, hasPermission, refetchUser } = useAuth();
  const queryClient = useQueryClient();
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const canUpdate = hasPermission('org:update');

  const {
    data: orgResponse,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['organization', activeOrganization?.organizationId],
    queryFn: () => organizationsApi.getOrganization(activeOrganization!.organizationId),
    enabled: Boolean(activeOrganization),
  });

  const org = orgResponse?.data;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<UpdateOrganizationInput>({
    resolver: zodResolver(updateOrganizationSchema),
    values: {
      name: org?.name || '',
      domain: org?.domain || '',
    },
  });

  // Re-sync form default values when data loads
  React.useEffect(() => {
    if (org) {
      reset({
        name: org.name,
        domain: org.domain || '',
      });
    }
  }, [org, reset]);

  const updateMutation = useMutation({
    mutationFn: async (data: UpdateOrganizationInput) => {
      if (!activeOrganization) throw new Error('No active organization');
      return organizationsApi.updateOrganization(activeOrganization.organizationId, data);
    },
    onSuccess: async () => {
      setSuccessMessage('Organization profile updated successfully.');
      setErrorMessage(null);
      await refetch();
      await refetchUser();
      await queryClient.invalidateQueries({ queryKey: ['organization'] });
    },
    onError: (err: any) => {
      setErrorMessage(err.message || 'Failed to update organization profile.');
      setSuccessMessage(null);
    },
  });

  const onSubmit = async (data: UpdateOrganizationInput) => {
    setSuccessMessage(null);
    setErrorMessage(null);
    await updateMutation.mutateAsync(data);
  };

  if (isLoading) {
    return <PageLoader text="Loading organization details..." />;
  }

  if (!activeOrganization || !org) {
    return (
      <div className="p-6">
        <Alert variant="warning" title="Organization Not Found">
          Could not retrieve details for the currently active tenant organization.
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Organization Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage organization identity, custom corporate email domains, and multi-tenant isolation parameters.
        </p>
      </div>

      {successMessage && (
        <Alert variant="success" title="Success">
          {successMessage}
        </Alert>
      )}

      {errorMessage && (
        <Alert variant="destructive" title="Error">
          {errorMessage}
        </Alert>
      )}

      {/* Overview Metadata Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg">{org.name}</CardTitle>
                <CardDescription className="text-xs">
                  Organization Identifier: <span className="font-mono">{org.id}</span>
                </CardDescription>
              </div>
            </div>
            <Badge variant={org.status === 'active' ? 'success' : 'secondary'} className="capitalize">
              {org.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-2 border-t border-border">
            <div>
              <span className="text-xs text-muted-foreground block">Slug</span>
              <span className="font-mono text-xs font-semibold text-foreground">{org.slug}</span>
            </div>
            <div>
              <span className="text-xs text-muted-foreground block">Primary Domain</span>
              <span className="text-xs font-semibold text-foreground">{org.domain || 'Not configured'}</span>
            </div>
            <div>
              <span className="text-xs text-muted-foreground block">Created</span>
              <span className="text-xs text-foreground">
                {new Date(org.createdAt).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            </div>
            <div>
              <span className="text-xs text-muted-foreground block">Isolation Mode</span>
              <span className="text-xs font-semibold text-emerald-600 flex items-center space-x-1">
                <Shield className="h-3 w-3 inline" />
                <span>RLS Active</span>
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Organization Profile Form */}
      <Card>
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardHeader>
            <CardTitle className="text-base">Profile & Domain Configuration</CardTitle>
            <CardDescription className="text-xs">
              Configure company display name and associated domain for automated SSO discovery.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!canUpdate && (
              <Alert variant="info" title="Read-Only Mode">
                You do not have the <span className="font-mono text-xs">org:update</span> permission. Only organization administrators can modify these settings.
              </Alert>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Organization Name"
                placeholder="Acme Corporation"
                disabled={!canUpdate || isSubmitting}
                {...register('name')}
                error={errors.name?.message}
              />

              <Input
                label="Corporate Email Domain"
                placeholder="acme.com"
                helperText="Used for automated SSO discovery during user authentication"
                leftIcon={<Globe className="h-4 w-4" />}
                disabled={!canUpdate || isSubmitting}
                {...register('domain')}
                error={errors.domain?.message}
              />
            </div>
          </CardContent>

          {canUpdate && (
            <CardFooter className="flex justify-end border-t border-border pt-4">
              <Button type="submit" disabled={isSubmitting || !isDirty} className="space-x-1.5">
                <Save className="h-4 w-4" />
                <span>{isSubmitting ? 'Saving changes...' : 'Save Changes'}</span>
              </Button>
            </CardFooter>
          )}
        </form>
      </Card>

      {/* Security & Tenant Isolation Technical Architecture Details */}
      <Card className="border-muted bg-muted/20">
        <CardHeader>
          <CardTitle className="text-base flex items-center space-x-2">
            <Database className="h-4 w-4 text-primary" />
            <span>Multi-Tenant Isolation Architecture</span>
          </CardTitle>
          <CardDescription className="text-xs">
            How your tenant data is cryptographically and logically protected in the shared database
          </CardDescription>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground space-y-3 leading-relaxed">
          <p>
            This platform uses a <strong className="text-foreground">Shared Database with Row-Level Tenant Isolation</strong>.
            All tenant queries execute within a PostgreSQL session scope where <code className="font-mono text-foreground">app.current_tenant_id</code> is set from the authenticated and cryptographically verified session token.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <div className="p-3 bg-card rounded-lg border border-border">
              <div className="font-semibold text-foreground mb-1">Composite Foreign Keys</div>
              Cross-tenant reference tampering is rejected at the database engine level via composite constraints.
            </div>
            <div className="p-3 bg-card rounded-lg border border-border">
              <div className="font-semibold text-foreground mb-1">Row-Level Security (RLS)</div>
              Database-level policies ensure queries physically cannot inspect records belonging to other tenants.
            </div>
            <div className="p-3 bg-card rounded-lg border border-border">
              <div className="font-semibold text-foreground mb-1">Session Pinning</div>
              Session cookies explicitly tie identity and organization membership, rotating on tenant switch.
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
