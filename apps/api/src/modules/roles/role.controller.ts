import { FastifyReply, FastifyRequest } from 'fastify';
import { RoleService } from './role.service.js';
import { CreateRoleDTO, UpdateRoleDTO } from './role.types.js';

export class RoleController {
  constructor(private roleService = new RoleService()) {}

  async list(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const tenantId = request.tenantContext!.organizationId;
    const roles = await this.roleService.listRoles(tenantId);
    reply.status(200).send({ success: true, data: roles });
  }

  async create(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const tenantId = request.tenantContext!.organizationId;
    const actorUserId = request.tenantContext!.userId;
    const body = request.body as CreateRoleDTO;

    const role = await this.roleService.createRole(tenantId, actorUserId, body);
    reply.status(201).send({ success: true, data: role });
  }

  async update(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const tenantId = request.tenantContext!.organizationId;
    const actorUserId = request.tenantContext!.userId;
    const { id } = request.params as { id: string };
    const body = request.body as UpdateRoleDTO;

    const role = await this.roleService.updateRole(tenantId, id, actorUserId, body);
    reply.status(200).send({ success: true, data: role });
  }

  async delete(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const tenantId = request.tenantContext!.organizationId;
    const actorUserId = request.tenantContext!.userId;
    const { id } = request.params as { id: string };

    const result = await this.roleService.deleteRole(tenantId, id, actorUserId);
    reply.status(200).send(result);
  }
}
