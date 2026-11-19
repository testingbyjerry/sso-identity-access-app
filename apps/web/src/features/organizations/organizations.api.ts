import { ApiResponse, OrganizationDTO } from '@sso/shared';
import { UpdateOrganizationInput } from '@sso/validation';
import { apiClient } from '../../lib/api-client.js';

export const organizationsApi = {
  getOrganization: async (id: string): Promise<ApiResponse<OrganizationDTO>> => {
    return apiClient.get(`/api/v1/organizations/${id}`);
  },

  updateOrganization: async (
    id: string,
    data: UpdateOrganizationInput
  ): Promise<ApiResponse<OrganizationDTO>> => {
    return apiClient.patch(`/api/v1/organizations/${id}`, data);
  },
};
