import { AuditLogRepository } from '../audit-logs/audit-log.repository.js';
import { BadRequestError, NotFoundError, RoleDTO } from '@sso/shared';
import { RoleRepository } from './role.repository.js';
import { CreateRoleDTO, UpdateRoleDTO } from './role.types.js';

export class RoleService {
  constructor(
    private roleRepo = new RoleRepository(),
    private auditRepo = new AuditLogRepository()
  ) {}

  async listRoles(tenantId: string): Promise<RoleDTO[]> {
    return this.roleRepo.findByTenant(tenantId);
  }

  async getRole(tenantId: string, id: string): Promise<RoleDTO> {
    const role = await this.roleRepo.findById(tenantId, id);
    if (!role) {
      throw new NotFoundError(`Role ${id} not found in this organization`);
    }
    return role;
  }

  async createRole(tenantId: string, actorUserId: string, data: CreateRoleDTO): Promise<RoleDTO> {
    const role = await this.roleRepo.create(tenantId, data);

    await this.auditRepo.create({
      organizationId: tenantId,
      actorUserId,
      action: 'role.created',
      entityType: 'role',
      entityId: role.id,
      metadata: { name: role.name, permissions: role.permissions },
    });

    return role;
  }

  async updateRole(
    tenantId: string,
    id: string,
    actorUserId: string,
    data: UpdateRoleDTO
  ): Promise<RoleDTO> {
    const existing = await this.roleRepo.findById(tenantId, id);
    if (!existing) {
      throw new NotFoundError(`Role ${id} not found in this organization`);
    }

    if (existing.isSystem && data.name && data.name !== existing.name) {
      throw new BadRequestError('Cannot rename system roles');
    }

    const updated = await this.roleRepo.update(tenantId, id, data);
    if (!updated) {
      throw new NotFoundError(`Role ${id} not found in this organization`);
    }

    await this.auditRepo.create({
      organizationId: tenantId,
      actorUserId,
      action: 'role.updated',
      entityType: 'role',
      entityId: id,
      metadata: data as Record<string, unknown>,
    });

    return updated;
  }

  async deleteRole(
    tenantId: string,
    id: string,
    actorUserId: string
  ): Promise<{ success: true; message: string }> {
    const existing = await this.roleRepo.findById(tenantId, id);
    if (!existing) {
      throw new NotFoundError(`Role ${id} not found in this organization`);
    }

    if (existing.isSystem) {
      throw new BadRequestError('System roles cannot be deleted');
    }

    const deleted = await this.roleRepo.delete(tenantId, id);
    if (!deleted) {
      throw new BadRequestError('Role cannot be deleted (may have active member assignments)');
    }

    await this.auditRepo.create({
      organizationId: tenantId,
      actorUserId,
      action: 'role.deleted',
      entityType: 'role',
      entityId: id,
    });

    return { success: true, message: 'Role deleted successfully' };
  }
}
