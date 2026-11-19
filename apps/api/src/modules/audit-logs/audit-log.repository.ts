import { AuditLog, auditLogs, withTenantTransaction } from '@sso/database';
import { and, count, desc, eq } from 'drizzle-orm';
import { AuditQueryDTO, CreateAuditLogDTO } from './audit-log.types.js';

export class AuditLogRepository {
  async findByTenant(
    tenantId: string,
    query: AuditQueryDTO
  ): Promise<{ data: AuditLog[]; total: number }> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const offset = (page - 1) * limit;

    return withTenantTransaction(tenantId, async (tx) => {
      const conditions = [eq(auditLogs.organizationId, tenantId)];

      if (query.action) {
        conditions.push(eq(auditLogs.action, query.action));
      }
      if (query.entityType) {
        conditions.push(eq(auditLogs.entityType, query.entityType));
      }
      if (query.actorUserId) {
        conditions.push(eq(auditLogs.actorUserId, query.actorUserId));
      }

      const rows = await tx
        .select()
        .from(auditLogs)
        .where(and(...conditions))
        .orderBy(desc(auditLogs.createdAt))
        .limit(limit)
        .offset(offset);

      const [totalCount] = await tx
        .select({ count: count() })
        .from(auditLogs)
        .where(and(...conditions));

      return {
        data: rows,
        total: totalCount ? Number(totalCount.count) : 0,
      };
    });
  }

  async create(data: CreateAuditLogDTO): Promise<AuditLog> {
    return withTenantTransaction(data.organizationId, async (tx) => {
      const [log] = await tx
        .insert(auditLogs)
        .values({
          organizationId: data.organizationId,
          actorUserId: data.actorUserId,
          action: data.action,
          entityType: data.entityType,
          entityId: data.entityId,
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
          metadata: data.metadata || {},
        })
        .returning();
      return log!;
    });
  }
}
