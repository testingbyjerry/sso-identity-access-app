import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { DashboardLayout } from '../src/components/layout/DashboardLayout.js';
import * as useAuthModule from '../src/features/auth/useAuth.js';

vi.mock('../src/features/auth/useAuth.js', () => ({
  useAuth: vi.fn(),
}));

describe('Organization Switcher in DashboardLayout', () => {
  const mockSwitchOrg = vi.fn();
  const mockLogout = vi.fn();

  const mockUser = {
    id: 'u-1',
    email: 'alice@acme.com',
    firstName: 'Alice',
    lastName: 'Smith',
    isSuperAdmin: false,
    activeOrganizationId: 'org-1',
    organizations: [
      {
        organizationId: 'org-1',
        organizationName: 'Acme Global Corp',
        organizationSlug: 'acme-global',
        roles: ['Admin'],
        permissions: ['*'],
      },
      {
        organizationId: 'org-2',
        organizationName: 'Beta Technologies',
        organizationSlug: 'beta-tech',
        roles: ['Member'],
        permissions: ['org:read'],
      },
    ],
  };

  it('renders active organization name and allows switching', async () => {
    (useAuthModule.useAuth as any).mockReturnValue({
      user: mockUser,
      activeOrganization: mockUser.organizations[0],
      organizations: mockUser.organizations,
      isSuperAdmin: false,
      switchOrganization: mockSwitchOrg,
      isSwitchingOrg: false,
      logout: mockLogout,
    });

    render(
      <BrowserRouter>
        <DashboardLayout />
      </BrowserRouter>
    );

    // Active organization should be visible
    expect(screen.getByText('Acme Global Corp')).toBeInTheDocument();

    // Click the organization switcher dropdown button
    const orgDropdownBtn = screen.getByRole('button', { name: /Switch Organization/i });
    fireEvent.click(orgDropdownBtn);

    // Dropdown options should now appear
    expect(screen.getByText('Beta Technologies')).toBeInTheDocument();

    // Click on Beta Technologies to switch
    fireEvent.click(screen.getByText('Beta Technologies'));

    await waitFor(() => {
      expect(mockSwitchOrg).toHaveBeenCalledWith('org-2');
    });
  });
});
