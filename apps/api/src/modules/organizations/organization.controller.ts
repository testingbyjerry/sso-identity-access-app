import { FastifyReply, FastifyRequest } from 'fastify';
import { OrganizationService } from './organization.service.js';
import { CreateOrgDTO, OrgQueryDTO, UpdateOrgDTO } from './organization.types.js';

export class OrganizationController {
  constructor(private orgService = new OrganizationService()) {}

  async list(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const userId = request.headers['x-user-id'] as string;
    const query = request.query as OrgQueryDTO;

    const result = await this.orgService.listUserOrganizations(userId, query.page, query.limit);
    reply.status(200).send(result);
  }

  async getById(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { id } = request.params as { id: string };
    const org = await this.orgService.getOrganizationById(id);
    reply.status(200).send({ success: true, data: org });
  }

  async create(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const userId = request.headers['x-user-id'] as string;
    const body = request.body as CreateOrgDTO;

    const org = await this.orgService.createOrganization(userId, body);
    reply.status(201).send({ success: true, data: org });
  }

  async update(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { id } = request.params as { id: string };
    const userId = request.headers['x-user-id'] as string;
    const body = request.body as UpdateOrgDTO;

    const org = await this.orgService.updateOrganization(id, body, userId);
    reply.status(200).send({ success: true, data: org });
  }
}
