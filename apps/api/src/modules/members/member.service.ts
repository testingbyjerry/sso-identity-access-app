import { randomBytes } from 'node:crypto';
import { AuditLogRepository } from '../audit-logs/audit-log.repository.js';
import { NotFoundError, PaginatedResponse } from '@sso/shared';
import { MemberRepository } from './member.repository.js';
import { InviteMemberDTO, MemberResultDTO, UpdateMemberDTO } from './member.types.js';

export class MemberService {
  constructor(
    private memberRepo = new MemberRepository(),
    private auditRepo = new AuditLogRepository()
  ) {}

  async listMembers(
    tenantId: string,
    page = 1,
    limit = 20
  ): Promise<PaginatedResponse<MemberResultDTO>> {
    const { data, total } = await this.memberRepo.findByTenant(tenantId, page, limit);

    return {
      success: true,
      data,
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

  async inviteMember(tenantId: string, invitedByUserId: string, data: InviteMemberDTO) {
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const invitation = await this.memberRepo.createInvitation(tenantId, {
      email: data.email,
      roleId: data.roleId,
      invitedByUserId,
      token,
      expiresAt,
    });

    await this.auditRepo.create({
      organizationId: tenantId,
      actorUserId: invitedByUserId,
      action: 'member.invited',
      entityType: 'invitation',
      entityId: invitation.id,
      metadata: { email: data.email, roleId: data.roleId },
    });

    return {
      id: invitation.id,
      organizationId: invitation.organizationId,
      email: invitation.email,
      roleId: invitation.roleId,
      status: invitation.status,
      expiresAt: invitation.expiresAt.toISOString(),
      createdAt: invitation.createdAt.toISOString(),
    };
  }

  async updateMember(tenantId: string, id: string, actorUserId: string, data: UpdateMemberDTO) {
    const updated = await this.memberRepo.updateMember(tenantId, id, data);
    if (!updated) {
      throw new NotFoundError(`Member ${id} not found in this organization`);
    }

    await this.auditRepo.create({
      organizationId: tenantId,
      actorUserId,
      action: 'member.updated',
      entityType: 'member',
      entityId: id,
      metadata: data as Record<string, unknown>,
    });

    return {
      id: updated.id,
      organizationId: updated.organizationId,
      userId: updated.userId,
      status: updated.status,
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  async removeMember(tenantId: string, id: string, actorUserId: string) {
    const removed = await this.memberRepo.removeMember(tenantId, id);
    if (!removed) {
      throw new NotFoundError(`Member ${id} not found in this organization`);
    }

    await this.auditRepo.create({
      organizationId: tenantId,
      actorUserId,
      action: 'member.removed',
      entityType: 'member',
      entityId: id,
    });

    return { success: true, message: 'Member removed successfully' };
  }
}
