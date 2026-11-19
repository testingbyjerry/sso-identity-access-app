import { ApiResponse, MemberDTO, PaginatedResponse, RoleDTO } from '@sso/shared';
import { InviteMemberInput, UpdateMemberInput } from '@sso/validation';
import { apiClient } from '../../lib/api-client.js';

export interface ListMembersParams {
  search?: string;
  status?: string;
  roleId?: string;
  page?: number;
  limit?: number;
}

export const membersApi = {
  listMembers: async (params?: ListMembersParams): Promise<PaginatedResponse<MemberDTO>> => {
    return apiClient.get('/api/v1/members', {
      params: {
        page: params?.page ?? 1,
        limit: params?.limit ?? 20,
        search: params?.search,
        status: params?.status,
        roleId: params?.roleId,
      },
    });
  },

  inviteMember: async (data: InviteMemberInput): Promise<ApiResponse<{ invitation: unknown }>> => {
    return apiClient.post('/api/v1/members/invite', data);
  },

  updateMember: async (
    id: string,
    data: UpdateMemberInput
  ): Promise<ApiResponse<MemberDTO>> => {
    return apiClient.patch(`/api/v1/members/${id}`, data);
  },

  removeMember: async (id: string): Promise<ApiResponse<{ removed: boolean }>> => {
    return apiClient.delete(`/api/v1/members/${id}`);
  },

  listRoles: async (): Promise<ApiResponse<RoleDTO[]>> => {
    return apiClient.get('/api/v1/roles');
  },
};
