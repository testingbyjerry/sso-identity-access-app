import { ApiResponse, SessionDTO } from '@sso/shared';
import { apiClient } from '../../lib/api-client.js';

export const sessionsApi = {
  listSessions: async (): Promise<ApiResponse<SessionDTO[]>> => {
    return apiClient.get('/api/v1/sessions');
  },

  revokeSession: async (id: string): Promise<ApiResponse<{ revoked: boolean }>> => {
    return apiClient.delete(`/api/v1/sessions/${id}`);
  },

  revokeAllOtherSessions: async (): Promise<ApiResponse<{ revokedCount: number }>> => {
    return apiClient.delete('/api/v1/sessions');
  },
};
