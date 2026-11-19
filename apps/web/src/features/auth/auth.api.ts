import {
  ApiResponse,
  CurrentUserDTO,
  SessionDTO,
  SsoInitiateResult,
} from '@sso/shared';
import {
  ForgotPasswordInput,
  LoginInput,
  ResetPasswordInput,
  SsoCallbackQuery,
  SsoStartInput,
  SwitchOrganizationInput,
} from '@sso/validation';
import { apiClient } from '../../lib/api-client.js';

export const authApi = {
  login: async (data: LoginInput): Promise<ApiResponse<{ user: CurrentUserDTO; session: SessionDTO; activeOrganizationId: string | null }>> => {
    return apiClient.post('/api/v1/auth/login', data);
  },

  logout: async (): Promise<ApiResponse<{ loggedOut: boolean }>> => {
    return apiClient.post('/api/v1/auth/logout');
  },

  getMe: async (): Promise<ApiResponse<CurrentUserDTO>> => {
    return apiClient.get('/api/v1/auth/me');
  },

  forgotPassword: async (data: ForgotPasswordInput): Promise<ApiResponse<{ message: string }>> => {
    return apiClient.post('/api/v1/auth/forgot-password', data);
  },

  resetPassword: async (data: ResetPasswordInput): Promise<ApiResponse<{ message: string }>> => {
    return apiClient.post('/api/v1/auth/reset-password', data);
  },

  switchOrganization: async (
    data: SwitchOrganizationInput
  ): Promise<ApiResponse<{ session: SessionDTO }>> => {
    return apiClient.post('/api/v1/auth/switch-organization', data);
  },

  ssoDiscover: async (query: string): Promise<ApiResponse<{ id: string; name: string; slug: string; type: string; organizationId: string; domains: string[] }>> => {
    return apiClient.get('/api/v1/auth/sso/discover', { params: { query } });
  },

  ssoStart: async (data: SsoStartInput): Promise<ApiResponse<SsoInitiateResult>> => {
    return apiClient.post('/api/v1/auth/sso/start', data);
  },

  ssoCallback: async (params: SsoCallbackQuery): Promise<ApiResponse<{ user: CurrentUserDTO; session: SessionDTO; activeOrganizationId: string | null }>> => {
    return apiClient.get('/api/v1/auth/sso/callback', {
      params: { code: params.code, state: params.state },
    });
  },

  getCsrfToken: async (): Promise<ApiResponse<{ csrfToken: string }>> => {
    return apiClient.get('/api/v1/auth/csrf');
  },
};
