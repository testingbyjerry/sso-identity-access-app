import { ApiResponse, IdentityProviderDTO } from '@sso/shared';
import { CreateIdentityProviderInput, UpdateIdentityProviderInput } from '@sso/validation';
import { apiClient } from '../../lib/api-client.js';

export interface TestIdpResult {
  success: boolean;
  message: string;
  issuer?: string;
  jwksUri?: string;
}

export const identityProvidersApi = {
  listIdps: async (): Promise<ApiResponse<IdentityProviderDTO[]>> => {
    return apiClient.get('/api/v1/identity-providers');
  },

  getIdp: async (id: string): Promise<ApiResponse<IdentityProviderDTO>> => {
    return apiClient.get(`/api/v1/identity-providers/${id}`);
  },

  createIdp: async (
    data: CreateIdentityProviderInput
  ): Promise<ApiResponse<IdentityProviderDTO>> => {
    return apiClient.post('/api/v1/identity-providers', data);
  },

  updateIdp: async (
    id: string,
    data: UpdateIdentityProviderInput
  ): Promise<ApiResponse<IdentityProviderDTO>> => {
    return apiClient.patch(`/api/v1/identity-providers/${id}`, data);
  },

  deleteIdp: async (id: string): Promise<ApiResponse<{ success: boolean; message: string }>> => {
    return apiClient.delete(`/api/v1/identity-providers/${id}`);
  },

  testIdp: async (id: string): Promise<ApiResponse<TestIdpResult>> => {
    return apiClient.post(`/api/v1/identity-providers/${id}/test`);
  },
};
