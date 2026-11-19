import { AuditLogDTO, PaginatedResponse } from '@sso/shared';
import { apiClient } from '../../lib/api-client.js';

export interface ListAuditLogsParams {
  action?: string;
  entityType?: string;
  actorUserId?: string;
  page?: number;
  limit?: number;
}

export const auditLogsApi = {
  listAuditLogs: async (params?: ListAuditLogsParams): Promise<PaginatedResponse<AuditLogDTO>> => {
    return apiClient.get('/api/v1/audit-logs', {
      params: {
        page: params?.page ?? 1,
        limit: params?.limit ?? 20,
        action: params?.action,
        entityType: params?.entityType,
        actorUserId: params?.actorUserId,
      },
    });
  },
};
