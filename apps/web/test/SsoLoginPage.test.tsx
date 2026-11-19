import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SsoLoginPage } from '../src/pages/auth/SsoLoginPage.js';
import { authApi } from '../src/features/auth/auth.api.js';

vi.mock('../src/features/auth/auth.api.js', () => ({
  authApi: {
    ssoDiscover: vi.fn(),
    ssoStart: vi.fn(),
  },
}));

function renderSsoPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <SsoLoginPage />
      </BrowserRouter>
    </QueryClientProvider>
  );
}

describe('SsoLoginPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders SSO discovery prompt and inputs', () => {
    renderSsoPage();

    expect(screen.getByRole('heading', { name: /Enterprise SSO/i })).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(/alice@acme.com or acme.com/i)
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Find SSO Provider/i })).toBeInTheDocument();
  });

  it('performs discovery and displays discovered identity provider details', async () => {
    (authApi.ssoDiscover as any).mockResolvedValueOnce({
      success: true,
      data: {
        id: 'idp-1',
        name: 'Acme Corp Entra ID',
        slug: 'acme-entra',
        type: 'microsoft',
        organizationId: 'org-1',
        domains: ['acme.com'],
      },
    });

    renderSsoPage();

    const input = screen.getByPlaceholderText(/alice@acme.com or acme.com/i);
    fireEvent.change(input, { target: { value: 'acme.com' } });
    fireEvent.click(screen.getByRole('button', { name: /Find SSO Provider/i }));

    await waitFor(() => {
      expect(authApi.ssoDiscover).toHaveBeenCalledWith('acme.com');
      expect(screen.getByText('Acme Corp Entra ID')).toBeInTheDocument();
      expect(screen.getByText('Provider Detected')).toBeInTheDocument();
    });
  });

  it('initiates SSO authorization flow on provider selection', async () => {
    (authApi.ssoDiscover as any).mockResolvedValueOnce({
      success: true,
      data: {
        id: 'idp-1',
        name: 'Okta Enterprise SSO',
        slug: 'acme-okta',
        type: 'oidc',
        organizationId: 'org-1',
        domains: ['acme.com'],
      },
    });

    (authApi.ssoStart as any).mockResolvedValueOnce({
      success: true,
      data: {
        authorizationUrl: 'https://okta.com/oauth2/v1/authorize?client_id=123',
      },
    });

    renderSsoPage();

    const input = screen.getByPlaceholderText(/alice@acme.com or acme.com/i);
    fireEvent.change(input, { target: { value: 'acme.com' } });
    fireEvent.click(screen.getByRole('button', { name: /Find SSO Provider/i }));

    await waitFor(() => {
      expect(screen.getByText('Okta Enterprise SSO')).toBeInTheDocument();
    });

    const continueBtn = screen.getByRole('button', { name: /Continue to Okta Enterprise SSO/i });
    fireEvent.click(continueBtn);

    await waitFor(() => {
      expect(authApi.ssoStart).toHaveBeenCalledWith({
        providerId: 'idp-1',
      });
    });
  });
});
