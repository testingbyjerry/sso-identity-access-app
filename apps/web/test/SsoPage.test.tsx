import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SsoPage } from '../src/pages/dashboard/SsoPage.js';
import { identityProvidersApi } from '../src/features/identity-providers/identity-providers.api.js';
import * as useAuthModule from '../src/features/auth/useAuth.js';

vi.mock('../src/features/identity-providers/identity-providers.api.js', () => ({
  identityProvidersApi: {
    listIdps: vi.fn(),
    createIdp: vi.fn(),
    updateIdp: vi.fn(),
    deleteIdp: vi.fn(),
    testIdp: vi.fn(),
  },
}));

vi.mock('../src/features/auth/useAuth.js', () => ({
  useAuth: vi.fn(),
}));

function renderSsoPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <SsoPage />
      </BrowserRouter>
    </QueryClientProvider>
  );
}

describe('SsoPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockActiveOrg = {
    organizationId: 'org-1',
    organizationName: 'Acme Corp',
    organizationSlug: 'acme',
    roles: ['Admin'],
    permissions: ['idp:create', 'idp:update', 'idp:delete'],
  };

  const mockIdps = [
    {
      id: 'idp-1',
      organizationId: 'org-1',
      type: 'microsoft' as const,
      name: 'Microsoft Entra ID Production',
      slug: 'entra-id',
      enabled: true,
      domains: ['acme.com'],
      config: {
        issuer: 'https://login.microsoftonline.com/common/v2.0',
        clientId: 'app-client-12345',
        clientSecret: '********',
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  it('renders configured SSO providers with write-only secret indicators', async () => {
    (useAuthModule.useAuth as any).mockReturnValue({
      activeOrganization: mockActiveOrg,
      hasPermission: () => true,
    });

    (identityProvidersApi.listIdps as any).mockResolvedValueOnce({
      success: true,
      data: mockIdps,
    });

    renderSsoPage();

    await waitFor(() => {
      expect(screen.getByText('Microsoft Entra ID Production')).toBeInTheDocument();
      expect(screen.getByText('app-client-12345')).toBeInTheDocument();
      expect(screen.getByText(/Write-Only/i)).toBeInTheDocument();
      expect(screen.getByText(/Redirect Callback URI/i)).toBeInTheDocument();
    });
  });

  it('triggers live connection test and renders verification result', async () => {
    (useAuthModule.useAuth as any).mockReturnValue({
      activeOrganization: mockActiveOrg,
      hasPermission: () => true,
    });

    (identityProvidersApi.listIdps as any).mockResolvedValueOnce({
      success: true,
      data: mockIdps,
    });

    (identityProvidersApi.testIdp as any).mockResolvedValueOnce({
      success: true,
      data: {
        success: true,
        message: 'Successfully discovered OIDC metadata and keys.',
        jwksUri: 'https://login.microsoftonline.com/common/discovery/v2.0/keys',
      },
    });

    renderSsoPage();

    await waitFor(() => {
      expect(screen.getByText('Microsoft Entra ID Production')).toBeInTheDocument();
    });

    const testBtn = screen.getByRole('button', { name: /Test Connection/i });
    fireEvent.click(testBtn);

    await waitFor(() => {
      expect(identityProvidersApi.testIdp).toHaveBeenCalledWith('idp-1');
      expect(screen.getByText(/Connection Verification Passed/i)).toBeInTheDocument();
      expect(screen.getByText(/Successfully discovered OIDC metadata and keys/i)).toBeInTheDocument();
    });
  });
});
