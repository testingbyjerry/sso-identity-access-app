import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MembersPage } from '../src/pages/dashboard/MembersPage.js';
import { membersApi } from '../src/features/members/members.api.js';
import * as useAuthModule from '../src/features/auth/useAuth.js';

vi.mock('../src/features/members/members.api.js', () => ({
  membersApi: {
    listMembers: vi.fn(),
    listRoles: vi.fn(),
    inviteMember: vi.fn(),
    updateMember: vi.fn(),
    removeMember: vi.fn(),
  },
}));

vi.mock('../src/features/auth/useAuth.js', () => ({
  useAuth: vi.fn(),
}));

function renderMembersPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <MembersPage />
      </BrowserRouter>
    </QueryClientProvider>
  );
}

describe('MembersPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockActiveOrg = {
    organizationId: 'org-1',
    organizationName: 'Acme Corp',
    organizationSlug: 'acme',
    roles: ['Admin'],
    permissions: ['member:invite', 'member:update', 'member:remove'],
  };

  const mockMembers = [
    {
      id: 'm-1',
      organizationId: 'org-1',
      userId: 'u-1',
      status: 'active',
      joinedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      user: {
        id: 'u-1',
        email: 'alice@acme.com',
        firstName: 'Alice',
        lastName: 'Admin',
      },
      roles: [{ id: 'r-1', name: 'Organization Admin' }],
    },
    {
      id: 'm-2',
      organizationId: 'org-1',
      userId: 'u-2',
      status: 'active',
      joinedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      user: {
        id: 'u-2',
        email: 'bob@acme.com',
        firstName: 'Bob',
        lastName: 'Developer',
      },
      roles: [{ id: 'r-2', name: 'Member' }],
    },
  ];

  it('renders members table and invite button for authorized users', async () => {
    (useAuthModule.useAuth as any).mockReturnValue({
      user: { id: 'u-1' },
      activeOrganization: mockActiveOrg,
      hasPermission: (perm: string) => mockActiveOrg.permissions.includes(perm),
    });

    (membersApi.listMembers as any).mockResolvedValueOnce({
      success: true,
      data: mockMembers,
      pagination: {
        total: 2,
        page: 1,
        limit: 10,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false,
      },
    });

    (membersApi.listRoles as any).mockResolvedValueOnce({
      success: true,
      data: [
        { id: 'r-1', name: 'Organization Admin', description: 'Full access' },
        { id: 'r-2', name: 'Member', description: 'Standard access' },
      ],
    });

    renderMembersPage();

    await waitFor(() => {
      expect(screen.getByText('Alice Admin')).toBeInTheDocument();
      expect(screen.getByText('alice@acme.com')).toBeInTheDocument();
      expect(screen.getByText('bob@acme.com')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Invite Member/i })).toBeInTheDocument();
    });
  });

  it('hides invite button when user lacks member:invite permission', async () => {
    (useAuthModule.useAuth as any).mockReturnValue({
      user: { id: 'u-2' },
      activeOrganization: {
        ...mockActiveOrg,
        permissions: ['org:read'],
      },
      hasPermission: () => false,
    });

    (membersApi.listMembers as any).mockResolvedValueOnce({
      success: true,
      data: mockMembers,
      pagination: { total: 2, page: 1, limit: 10, totalPages: 1, hasNextPage: false, hasPrevPage: false },
    });

    (membersApi.listRoles as any).mockResolvedValueOnce({
      success: true,
      data: [],
    });

    renderMembersPage();

    await waitFor(() => {
      expect(screen.getByText('alice@acme.com')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Invite Member/i })).not.toBeInTheDocument();
    });
  });
});
