import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { CurrentUserDTO, UserOrganizationMembershipSummary } from '@sso/shared';
import { authApi } from './auth.api.js';

interface AuthContextValue {
  user: CurrentUserDTO | null;
  activeOrganization: UserOrganizationMembershipSummary | null;
  organizations: UserOrganizationMembershipSummary[];
  isAuthenticated: boolean;
  isLoading: boolean;
  isSuperAdmin: boolean;
  hasPermission: (permissionKey: string) => boolean;
  switchOrganization: (organizationId: string) => Promise<void>;
  isSwitchingOrg: boolean;
  logout: () => Promise<void>;
  refetchUser: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Load current authenticated user via HTTP-only cookie session
  const {
    data: response,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      try {
        return await authApi.getMe();
      } catch {
        return null;
      }
    },
    retry: false,
    staleTime: 60 * 1000,
  });

  const user = response?.data || null;
  const isAuthenticated = Boolean(user);
  const isSuperAdmin = Boolean(user?.isSuperAdmin);
  const organizations = user?.organizations || [];

  const activeOrganization = React.useMemo(() => {
    if (!user) return null;
    if (user.activeOrganizationId) {
      const match = organizations.find((o) => o.organizationId === user.activeOrganizationId);
      if (match) return match;
    }
    return organizations[0] || null;
  }, [user, organizations]);

  const hasPermission = React.useCallback(
    (permissionKey: string): boolean => {
      if (isSuperAdmin) return true;
      if (!activeOrganization) return false;
      return (
        activeOrganization.permissions.includes(permissionKey) ||
        activeOrganization.permissions.includes('*')
      );
    },
    [isSuperAdmin, activeOrganization]
  );

  const switchOrgMutation = useMutation({
    mutationFn: async (organizationId: string) => {
      return authApi.switchOrganization({ organizationId });
    },
    onSuccess: async () => {
      // Invalidate all tenant-dependent caches and refetch user profile
      await queryClient.invalidateQueries();
      await refetch();
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      return authApi.logout();
    },
    onSuccess: async () => {
      queryClient.clear();
      navigate('/login');
    },
  });

  const switchOrganization = async (organizationId: string) => {
    await switchOrgMutation.mutateAsync(organizationId);
  };

  const logout = async () => {
    await logoutMutation.mutateAsync();
  };

  const refetchUser = async () => {
    await refetch();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        activeOrganization,
        organizations,
        isAuthenticated,
        isLoading,
        isSuperAdmin,
        hasPermission,
        switchOrganization,
        isSwitchingOrg: switchOrgMutation.isPending,
        logout,
        refetchUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
