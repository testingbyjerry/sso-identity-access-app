import { FastifyReply, FastifyRequest } from 'fastify';
import { IdentityProviderService } from './identity-provider.service.js';
import { CreateIdpDTO, UpdateIdpDTO } from './identity-provider.types.js';

export class IdentityProviderController {
  constructor(private idpService = new IdentityProviderService()) {}

  async list(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const tenantId = request.tenantContext!.organizationId;
    const idps = await this.idpService.listIdentityProviders(tenantId);
    reply.status(200).send({ success: true, data: idps });
  }

  async getById(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const tenantId = request.tenantContext!.organizationId;
    const { id } = request.params as { id: string };

    const idp = await this.idpService.getIdentityProvider(tenantId, id);
    reply.status(200).send({ success: true, data: idp });
  }

  async create(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const tenantId = request.tenantContext!.organizationId;
    const actorUserId = request.tenantContext!.userId;
    const body = request.body as CreateIdpDTO;

    const idp = await this.idpService.createIdentityProvider(tenantId, actorUserId, body);
    reply.status(201).send({ success: true, data: idp });
  }

  async update(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const tenantId = request.tenantContext!.organizationId;
    const actorUserId = request.tenantContext!.userId;
    const { id } = request.params as { id: string };
    const body = request.body as UpdateIdpDTO;

    const idp = await this.idpService.updateIdentityProvider(tenantId, id, actorUserId, body);
    reply.status(200).send({ success: true, data: idp });
  }

  async delete(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const tenantId = request.tenantContext!.organizationId;
    const actorUserId = request.tenantContext!.userId;
    const { id } = request.params as { id: string };

    const result = await this.idpService.deleteIdentityProvider(tenantId, id, actorUserId);
    reply.status(200).send(result);
  }

  async test(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const tenantId = request.tenantContext!.organizationId;
    const { id } = request.params as { id: string };

    const result = await this.idpService.testIdentityProvider(tenantId, id);
    reply.status(200).send({ success: true, data: result });
  }
}
