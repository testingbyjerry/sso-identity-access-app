import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  KeyRound,
  Plus,
  Copy,
  Shield,
  Trash2,
  Edit2,
  RefreshCw,
  Power,
  Check,
} from 'lucide-react';
import { useAuth } from '../../features/auth/useAuth.js';
import { identityProvidersApi, TestIdpResult } from '../../features/identity-providers/identity-providers.api.js';
import { IdentityProviderDTO } from '@sso/shared';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card.js';
import { Button } from '../../components/ui/button.js';
import { Input } from '../../components/ui/input.js';
import { Badge } from '../../components/ui/badge.js';
import { Alert } from '../../components/ui/alert.js';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../components/ui/dialog.js';
import { ConfirmDialog } from '../../components/ui/confirm-dialog.js';
import { EmptyState } from '../../components/ui/empty-state.js';
import { PageLoader, Spinner } from '../../components/ui/loading.js';

export function SsoPage() {
  const { activeOrganization, hasPermission } = useAuth();
  const queryClient = useQueryClient();

  const [copiedCallback, setCopiedCallback] = React.useState(false);
  const [toastMessage, setToastMessage] = React.useState<string | null>(null);

  // Modals state
  const [addModalOpen, setAddModalOpen] = React.useState(false);
  const [editModalOpen, setEditModalOpen] = React.useState(false);
  const [editingIdp, setEditingIdp] = React.useState<IdentityProviderDTO | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);
  const [deletingIdp, setDeletingIdp] = React.useState<IdentityProviderDTO | null>(null);

  // Testing connection state
  const [testingId, setTestingId] = React.useState<string | null>(null);
  const [testResult, setTestResult] = React.useState<{ id: string; result: TestIdpResult } | null>(null);

  // Form states for Add / Edit
  const [formData, setFormData] = React.useState({
    type: 'microsoft' as 'microsoft' | 'oidc',
    name: '',
    slug: '',
    issuer: '',
    clientId: '',
    clientSecret: '',
    tenantId: '',
    domain: '',
  });
  const [formError, setFormError] = React.useState<string | null>(null);

  const canCreate = hasPermission('idp:create');
  const canUpdate = hasPermission('idp:update');
  const canDelete = hasPermission('idp:delete');

  const redirectUri = typeof window !== 'undefined'
    ? `${window.location.origin}/api/v1/auth/sso/callback`
    : 'https://app.example.com/api/v1/auth/sso/callback';

  // Queries
  const {
    data: idpsResponse,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['idps', activeOrganization?.organizationId],
    queryFn: () => identityProvidersApi.listIdps(),
    enabled: Boolean(activeOrganization),
  });

  const idps = idpsResponse?.data || [];

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const isMicrosoft = data.type === 'microsoft';
      const issuer = isMicrosoft
        ? `https://login.microsoftonline.com/${data.tenantId || 'common'}/v2.0`
        : data.issuer;

      return identityProvidersApi.createIdp({
        type: data.type,
        name: data.name,
        slug: data.slug.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
        enabled: true,
        domains: data.domain ? [data.domain.trim()] : [],
        config: {
          issuer,
          clientId: data.clientId,
          clientSecret: data.clientSecret,
          tenantId: data.tenantId || undefined,
          scopes: ['openid', 'profile', 'email'],
          redirectUri,
          jitEnabled: true,
        },
      });
    },
    onSuccess: async () => {
      setToastMessage('Identity Provider configured successfully.');
      setAddModalOpen(false);
      resetForm();
      await refetch();
      await queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
    },
    onError: (err: any) => {
      setFormError(err.message || 'Failed to create identity provider.');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (!editingIdp) throw new Error('No IdP selected');
      const isMicrosoft = data.type === 'microsoft';
      const issuer = isMicrosoft
        ? `https://login.microsoftonline.com/${data.tenantId || 'common'}/v2.0`
        : data.issuer;

      const updatedConfig: Record<string, unknown> = {
        ...(editingIdp.config || {}),
        issuer,
        clientId: data.clientId,
        tenantId: data.tenantId || undefined,
      };

      // Only include clientSecret if non-empty (write-only security requirement)
      if (data.clientSecret && data.clientSecret.trim().length > 0) {
        updatedConfig.clientSecret = data.clientSecret.trim();
      }

      return identityProvidersApi.updateIdp(editingIdp.id, {
        name: data.name,
        domains: data.domain ? [data.domain.trim()] : [],
        config: updatedConfig,
      });
    },
    onSuccess: async () => {
      setToastMessage('Identity Provider updated successfully.');
      setEditModalOpen(false);
      setEditingIdp(null);
      resetForm();
      await refetch();
      await queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
    },
    onError: (err: any) => {
      setFormError(err.message || 'Failed to update identity provider.');
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: (idp: IdentityProviderDTO) =>
      identityProvidersApi.updateIdp(idp.id, { enabled: !idp.enabled }),
    onSuccess: async () => {
      await refetch();
      await queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
    },
    onError: (err: any) => {
      setToastMessage(err.message || 'Failed to toggle provider state.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => identityProvidersApi.deleteIdp(id),
    onSuccess: async () => {
      setToastMessage('Identity Provider removed.');
      setDeleteConfirmOpen(false);
      setDeletingIdp(null);
      await refetch();
      await queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
    },
    onError: (err: any) => {
      setToastMessage(err.message || 'Failed to delete provider.');
      setDeleteConfirmOpen(false);
    },
  });

  const handleTestConnection = async (idp: IdentityProviderDTO) => {
    setTestingId(idp.id);
    setTestResult(null);
    try {
      const res = await identityProvidersApi.testIdp(idp.id);
      setTestResult({ id: idp.id, result: res.data });
    } catch (err: any) {
      setTestResult({
        id: idp.id,
        result: {
          success: false,
          message: err.message || 'Connection test failed. Could not verify OIDC metadata.',
        },
      });
    } finally {
      setTestingId(null);
    }
  };

  const resetForm = () => {
    setFormData({
      type: 'microsoft',
      name: '',
      slug: '',
      issuer: '',
      clientId: '',
      clientSecret: '',
      tenantId: '',
      domain: '',
    });
    setFormError(null);
  };

  const handleOpenAdd = (type: 'microsoft' | 'oidc') => {
    resetForm();
    setFormData((prev) => ({
      ...prev,
      type,
      name: type === 'microsoft' ? 'Microsoft Entra ID' : 'Okta Workforce',
      slug: type === 'microsoft' ? 'azure-ad' : 'okta',
      issuer: type === 'oidc' ? 'https://your-org.okta.com' : '',
    }));
    setAddModalOpen(true);
  };

  const handleOpenEdit = (idp: IdentityProviderDTO) => {
    setEditingIdp(idp);
    const cfg = (idp.config || {}) as Record<string, any>;
    setFormData({
      type: (idp.type === 'microsoft' ? 'microsoft' : 'oidc'),
      name: idp.name,
      slug: idp.slug,
      issuer: cfg.issuer || '',
      clientId: cfg.clientId || '',
      clientSecret: '', // Write-only: intentionally blank
      tenantId: cfg.tenantId || '',
      domain: idp.domains?.[0] || '',
    });
    setFormError(null);
    setEditModalOpen(true);
  };

  const copyCallbackUrl = () => {
    navigator.clipboard.writeText(redirectUri);
    setCopiedCallback(true);
    setTimeout(() => setCopiedCallback(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">SSO & Identity Providers</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Connect corporate enterprise identity systems via OpenID Connect (OIDC) & PKCE.
          </p>
        </div>

        {canCreate && (
          <div className="flex items-center gap-2">
            <Button onClick={() => handleOpenAdd('microsoft')} className="space-x-1.5" size="sm">
              <Plus className="h-4 w-4" />
              <span>Add Entra ID</span>
            </Button>
            <Button onClick={() => handleOpenAdd('oidc')} variant="outline" className="space-x-1.5" size="sm">
              <Plus className="h-4 w-4" />
              <span>Add Okta / OIDC</span>
            </Button>
          </div>
        )}
      </div>

      {toastMessage && (
        <Alert variant="info" title="Notice" onClose={() => setToastMessage(null)}>
          {toastMessage}
        </Alert>
      )}

      {/* Configuration Guidance Card */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center space-x-2 text-foreground">
            <Shield className="h-4 w-4 text-primary" />
            <span>Redirect Callback URI</span>
          </CardTitle>
          <CardDescription className="text-xs">
            Add this exact Redirect / Callback URI to your Microsoft Entra ID App Registration or Okta OIDC Application settings:
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2">
            <code className="flex-1 p-2.5 rounded-lg bg-card border border-border font-mono text-xs text-foreground select-all overflow-x-auto">
              {redirectUri}
            </code>
            <Button variant="outline" size="sm" onClick={copyCallbackUrl} className="space-x-1.5">
              {copiedCallback ? (
                <>
                  <Check className="h-4 w-4 text-emerald-600" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  <span>Copy</span>
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* IdP Listing */}
      {isLoading ? (
        <div className="py-12">
          <PageLoader text="Loading identity providers..." />
        </div>
      ) : idps.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <EmptyState
              icon={<KeyRound className="h-8 w-8 text-muted-foreground" />}
              title="No identity providers configured"
              description="Federate authentication for this organization by connecting Microsoft Entra ID or Okta."
              actionLabel={canCreate ? 'Add Microsoft Entra ID' : undefined}
              onAction={canCreate ? () => handleOpenAdd('microsoft') : undefined}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {idps.map((idp) => {
            const isTesting = testingId === idp.id;
            const currentTest = testResult?.id === idp.id ? testResult.result : null;
            const cfg = (idp.config || {}) as Record<string, any>;

            return (
              <Card key={idp.id} className="relative overflow-hidden">
                <CardHeader className="pb-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center space-x-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <KeyRound className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <CardTitle className="text-base">{idp.name}</CardTitle>
                          <Badge variant="outline" className="text-xs font-mono capitalize">
                            {idp.type}
                          </Badge>
                          <Badge variant={idp.enabled ? 'success' : 'secondary'} className="text-xs">
                            {idp.enabled ? 'Active' : 'Disabled'}
                          </Badge>
                        </div>
                        <CardDescription className="text-xs mt-0.5">
                          Slug: <span className="font-mono text-foreground">{idp.slug}</span>
                          {idp.domains && idp.domains.length > 0 && (
                            <span className="ml-3">
                              Domain:{' '}
                              <span className="font-medium text-foreground">
                                {idp.domains.join(', ')}
                              </span>
                            </span>
                          )}
                        </CardDescription>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-2 pt-2 sm:pt-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleTestConnection(idp)}
                        disabled={isTesting}
                        className="space-x-1.5"
                      >
                        {isTesting ? <Spinner className="h-3.5 w-3.5" /> : <RefreshCw className="h-3.5 w-3.5" />}
                        <span>{isTesting ? 'Testing...' : 'Test Connection'}</span>
                      </Button>

                      {canUpdate && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleStatusMutation.mutate(idp)}
                            title={idp.enabled ? 'Disable Provider' : 'Enable Provider'}
                          >
                            <Power className={`h-4 w-4 ${idp.enabled ? 'text-emerald-600' : 'text-muted-foreground'}`} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenEdit(idp)}
                            title="Edit Configuration"
                          >
                            <Edit2 className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </>
                      )}

                      {canDelete && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setDeletingIdp(idp);
                            setDeleteConfirmOpen(true);
                          }}
                          className="text-destructive hover:bg-destructive/10"
                          title="Delete Provider"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3 pt-0">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 p-3 bg-muted/40 rounded-lg text-xs">
                    <div>
                      <span className="text-muted-foreground block">Client ID</span>
                      <span className="font-mono font-medium text-foreground truncate block">
                        {cfg.clientId || 'Not specified'}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Client Secret</span>
                      <span className="font-mono text-muted-foreground block">
                        •••••••••••••••• (Write-Only)
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Discovery Issuer</span>
                      <span className="font-mono text-xs text-foreground truncate block" title={cfg.issuer}>
                        {cfg.issuer || 'Default'}
                      </span>
                    </div>
                  </div>

                  {/* Connection Test Visual Feedback */}
                  {currentTest && (
                    <Alert
                      variant={currentTest.success ? 'success' : 'destructive'}
                      title={currentTest.success ? 'Connection Verification Passed' : 'Connection Verification Failed'}
                    >
                      <div className="space-y-1">
                        <p>{currentTest.message}</p>
                        {currentTest.jwksUri && (
                          <p className="font-mono text-[11px] text-muted-foreground truncate">
                            JWKS URI: {currentTest.jwksUri}
                          </p>
                        )}
                      </div>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Identity Provider Modal */}
      <Dialog open={addModalOpen} onClose={() => setAddModalOpen(false)}>
        <DialogHeader>
          <DialogTitle>
            Add {formData.type === 'microsoft' ? 'Microsoft Entra ID' : 'Okta OIDC'} Provider
          </DialogTitle>
          <DialogDescription>
            Configure single sign-on identity federation for this organization.
          </DialogDescription>
        </DialogHeader>

        {formError && (
          <div className="mb-4">
            <Alert variant="destructive" title="Validation Error">
              {formError}
            </Alert>
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!formData.name || !formData.slug || !formData.clientId || !formData.clientSecret) {
              setFormError('Please fill in all required fields.');
              return;
            }
            createMutation.mutate(formData);
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Provider Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              autoFocus
            />
            <Input
              label="Slug Identifier"
              placeholder="e.g. azure-ad"
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              required
            />
          </div>

          <Input
            label="Corporate Domain"
            placeholder="e.g. acme.com (for automated SSO discovery)"
            value={formData.domain}
            onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
          />

          {formData.type === 'microsoft' ? (
            <Input
              label="Microsoft Tenant ID"
              placeholder="common, organizations, or your Azure Tenant GUID"
              value={formData.tenantId}
              onChange={(e) => setFormData({ ...formData, tenantId: e.target.value })}
            />
          ) : (
            <Input
              label="OIDC Issuer URL"
              placeholder="https://dev-12345.okta.com"
              value={formData.issuer}
              onChange={(e) => setFormData({ ...formData, issuer: e.target.value })}
              required
            />
          )}

          <Input
            label="Client ID (Application ID)"
            placeholder="Enter OAuth / OIDC Client ID"
            value={formData.clientId}
            onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
            required
          />

          <Input
            label="Client Secret"
            type="password"
            placeholder="Enter OIDC Client Secret"
            value={formData.clientSecret}
            onChange={(e) => setFormData({ ...formData, clientSecret: e.target.value })}
            helperText="Write-only credential. Encrypted and hashed securely on the server."
            required
          />

          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => setAddModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Configuring Provider...' : 'Create Provider'}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>

      {/* Edit Identity Provider Modal */}
      <Dialog open={editModalOpen} onClose={() => setEditModalOpen(false)}>
        <DialogHeader>
          <DialogTitle>Edit Identity Provider</DialogTitle>
          <DialogDescription>
            Update provider details for {editingIdp?.name}.
          </DialogDescription>
        </DialogHeader>

        {formError && (
          <div className="mb-4">
            <Alert variant="destructive" title="Validation Error">
              {formError}
            </Alert>
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!formData.name || !formData.clientId) {
              setFormError('Please fill in required fields.');
              return;
            }
            updateMutation.mutate(formData);
          }}
          className="space-y-4"
        >
          <Input
            label="Provider Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />

          <Input
            label="Corporate Domain"
            placeholder="e.g. acme.com"
            value={formData.domain}
            onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
          />

          {formData.type === 'microsoft' ? (
            <Input
              label="Microsoft Tenant ID"
              placeholder="common or Tenant GUID"
              value={formData.tenantId}
              onChange={(e) => setFormData({ ...formData, tenantId: e.target.value })}
            />
          ) : (
            <Input
              label="OIDC Issuer URL"
              value={formData.issuer}
              onChange={(e) => setFormData({ ...formData, issuer: e.target.value })}
              required
            />
          )}

          <Input
            label="Client ID"
            value={formData.clientId}
            onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
            required
          />

          <Input
            label="Client Secret (Write-Only)"
            type="password"
            placeholder="Leave blank to keep existing secret"
            value={formData.clientSecret}
            onChange={(e) => setFormData({ ...formData, clientSecret: e.target.value })}
            helperText="For security, existing secrets are never displayed. Enter a new value only to rotate."
          />

          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => setEditModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Saving changes...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={() => {
          if (deletingIdp) deleteMutation.mutate(deletingIdp.id);
        }}
        title="Delete Identity Provider"
        description={`Are you sure you want to delete ${deletingIdp?.name}? Users will no longer be able to sign in via this SSO provider.`}
        confirmLabel="Delete Provider"
        variant="destructive"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
