import type { AuditLogQuery } from '@sso/validation';
import type { AuditLogDTO } from '@sso/shared';

export type AuditQueryDTO = AuditLogQuery;
export type AuditLogResultDTO = AuditLogDTO;

export interface CreateAuditLogDTO {
  organizationId: string;
  actorUserId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown>;
}
