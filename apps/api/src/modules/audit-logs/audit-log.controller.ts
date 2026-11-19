import { FastifyReply, FastifyRequest } from 'fastify';
import { AuditLogService } from './audit-log.service.js';
import { AuditQueryDTO } from './audit-log.types.js';

export class AuditLogController {
  constructor(private auditService = new AuditLogService()) {}

  async list(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const tenantId = request.tenantContext!.organizationId;
    const query = request.query as AuditQueryDTO;

    const result = await this.auditService.listAuditLogs(tenantId, query);
    reply.status(200).send(result);
  }
}
