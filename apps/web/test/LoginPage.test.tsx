import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LoginPage } from '../src/pages/auth/LoginPage.js';
import { AuthProvider } from '../src/features/auth/useAuth.js';
import { authApi } from '../src/features/auth/auth.api.js';

// Mock authApi
vi.mock('../src/features/auth/auth.api.js', () => ({
  authApi: {
    login: vi.fn(),
    getMe: vi.fn().mockResolvedValue({ success: true, data: null }),
  },
}));

function renderLoginPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

describe('LoginPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders login form elements and links', () => {
    renderLoginPage();

    expect(screen.getByRole('heading', { name: /Sign In/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Work Email/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText('••••••••••••')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sign In with Password/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Forgot password\?/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Single Sign-On \(SSO\)/i })).toBeInTheDocument();
  });

  it('toggles password visibility when the eye button is clicked', () => {
    renderLoginPage();

    const passwordInput = screen.getByPlaceholderText('••••••••••••');
    expect(passwordInput).toHaveAttribute('type', 'password');

    const toggleBtn = screen.getByLabelText(/Show password/i);
    fireEvent.click(toggleBtn);
    expect(passwordInput).toHaveAttribute('type', 'text');

    const hideBtn = screen.getByLabelText(/Hide password/i);
    fireEvent.click(hideBtn);
    expect(passwordInput).toHaveAttribute('type', 'password');
  });

  it('displays validation errors on invalid submission', async () => {
    renderLoginPage();

    const submitBtn = screen.getByRole('button', { name: /Sign In with Password/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Must be a valid email address/i)).toBeInTheDocument();
    });
  });

  it('submits valid credentials to authApi.login', async () => {
    (authApi.login as any).mockResolvedValueOnce({
      success: true,
      data: {
        user: { id: 'u-1', email: 'alice@acme.com', isSuperAdmin: false },
        session: { id: 's-1' },
      },
    });

    renderLoginPage();

    fireEvent.change(screen.getByLabelText(/Work Email/i), {
      target: { value: 'alice@acme.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('••••••••••••'), {
      target: { value: 'SecurePass123!' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Sign In with Password/i }));

    await waitFor(() => {
      expect(authApi.login).toHaveBeenCalledWith({
        email: 'alice@acme.com',
        password: 'SecurePass123!',
      });
    });
  });
});
