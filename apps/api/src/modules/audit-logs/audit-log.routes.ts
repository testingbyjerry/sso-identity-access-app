import { FastifyInstance } from 'fastify';
import { requireTenantContext } from '../../common/tenant-context.js';
import { AuditLogController } from './audit-log.controller.js';
import { listAuditLogsSchema } from './audit-log.schema.js';

export async function auditLogRoutes(app: FastifyInstance): Promise<void> {
  const controller = new AuditLogController();

  app.get(
    '/audit-logs',
    {
      preHandler: [requireTenantContext],
      schema: listAuditLogsSchema,
    },
    (req, rep) => controller.list(req, rep)
  );
}
