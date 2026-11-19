import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from '../src/components/layout/ProtectedRoute.js';
import * as useAuthModule from '../src/features/auth/useAuth.js';

vi.mock('../src/features/auth/useAuth.js', () => ({
  useAuth: vi.fn(),
}));

describe('ProtectedRoute Component', () => {
  it('redirects to /login when user is unauthenticated', () => {
    (useAuthModule.useAuth as any).mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
    });

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<div>Protected Dashboard Content</div>} />
          </Route>
          <Route path="/login" element={<div>Login Page Form</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.queryByText('Protected Dashboard Content')).not.toBeInTheDocument();
    expect(screen.getByText('Login Page Form')).toBeInTheDocument();
  });

  it('renders child components when user is authenticated', () => {
    (useAuthModule.useAuth as any).mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
    });

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<div>Protected Dashboard Content</div>} />
          </Route>
          <Route path="/login" element={<div>Login Page Form</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Protected Dashboard Content')).toBeInTheDocument();
    expect(screen.queryByText('Login Page Form')).not.toBeInTheDocument();
  });
});
