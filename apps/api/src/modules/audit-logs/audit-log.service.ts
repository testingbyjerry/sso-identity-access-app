import { AuditLogDTO, PaginatedResponse } from '@sso/shared';
import { AuditLogRepository } from './audit-log.repository.js';
import { AuditQueryDTO } from './audit-log.types.js';

export class AuditLogService {
  constructor(private auditRepo = new AuditLogRepository()) {}

  async listAuditLogs(
    tenantId: string,
    query: AuditQueryDTO
  ): Promise<PaginatedResponse<AuditLogDTO>> {
    const page = query.page || 1;
    const limit = query.limit || 20;

    const { data, total } = await this.auditRepo.findByTenant(tenantId, query);

    return {
      success: true,
      data: data.map((log) => ({
        id: log.id,
        organizationId: log.organizationId,
        actorUserId: log.actorUserId,
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        ipAddress: log.ipAddress,
        userAgent: log.userAgent,
        metadata: log.metadata as Record<string, unknown>,
        createdAt: log.createdAt.toISOString(),
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1,
      },
    };
  }
}
