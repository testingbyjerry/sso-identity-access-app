import { AuditLogRepository } from '../audit-logs/audit-log.repository.js';
import { ConflictError, NotFoundError, OrganizationDTO, PaginatedResponse } from '@sso/shared';
import {
  auditLogs,
  memberRoles,
  organizationMembers,
  permissions,
  rolePermissions,
  roles,
  withSystemTransaction,
} from '@sso/database';
import { OrganizationRepository } from './organization.repository.js';
import { CreateOrgDTO, UpdateOrgDTO } from './organization.types.js';

export class OrganizationService {
  constructor(
    private orgRepo = new OrganizationRepository(),
    private auditRepo = new AuditLogRepository()
  ) {}

  async listUserOrganizations(
    userId: string,
    page = 1,
    limit = 20
  ): Promise<PaginatedResponse<OrganizationDTO>> {
    const { data, total } = await this.orgRepo.findByUserId(userId, page, limit);

    return {
      success: true,
      data: data.map((org) => ({
        id: org.id,
        name: org.name,
        slug: org.slug,
        domain: org.domain,
        status: org.status,
        metadata: org.metadata as Record<string, unknown>,
        createdAt: org.createdAt.toISOString(),
        updatedAt: org.updatedAt.toISOString(),
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

  async getOrganizationById(id: string): Promise<OrganizationDTO> {
    const org = await this.orgRepo.findById(id);
    if (!org) {
      throw new NotFoundError(`Organization ${id} not found`);
    }

    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      domain: org.domain,
      status: org.status,
      metadata: org.metadata as Record<string, unknown>,
      createdAt: org.createdAt.toISOString(),
      updatedAt: org.updatedAt.toISOString(),
    };
  }

  async createOrganization(creatorUserId: string, data: CreateOrgDTO): Promise<OrganizationDTO> {
    const existing = await this.orgRepo.findBySlug(data.slug);
    if (existing) {
      throw new ConflictError(`Organization with slug "${data.slug}" already exists`);
    }

    // Creating an organization sets up its tenant boundary, default roles, and assigns creator as Owner
    return withSystemTransaction(async (tx) => {
      const org = await this.orgRepo.create(data);

      // 1. Create standard roles for new organization
      const [ownerRole] = await tx
        .insert(roles)
        .values({
          organizationId: org.id,
          name: 'Owner',
          description: 'Organization Owner with unrestricted administrative capabilities',
          isSystem: true,
        })
        .returning();

      await tx.insert(roles).values({
        organizationId: org.id,
        name: 'Admin',
        description: 'Organization Administrator',
        isSystem: true,
      });

      await tx.insert(roles).values({
        organizationId: org.id,
        name: 'Member',
        description: 'Standard Organization Member',
        isSystem: true,
      });

      // 2. Link existing platform permissions to owner role
      const allPerms = await tx.select().from(permissions);
      if (allPerms.length > 0 && ownerRole) {
        await tx.insert(rolePermissions).values(
          allPerms.map((p) => ({
            organizationId: org.id,
            roleId: ownerRole.id,
            permissionId: p.id,
          }))
        );
      }

      // 3. Add creator user as first member with Owner role
      const [member] = await tx
        .insert(organizationMembers)
        .values({
          organizationId: org.id,
          userId: creatorUserId,
          status: 'active',
        })
        .returning();

      if (member && ownerRole) {
        await tx.insert(memberRoles).values({
          organizationId: org.id,
          memberId: member.id,
          roleId: ownerRole.id,
        });
      }

      // 4. Record audit log
      await tx.insert(auditLogs).values({
        organizationId: org.id,
        actorUserId: creatorUserId,
        action: 'organization.created',
        entityType: 'organization',
        entityId: org.id,
        metadata: { slug: org.slug, name: org.name },
      });

      return {
        id: org.id,
        name: org.name,
        slug: org.slug,
        domain: org.domain,
        status: org.status,
        metadata: org.metadata as Record<string, unknown>,
        createdAt: org.createdAt.toISOString(),
        updatedAt: org.updatedAt.toISOString(),
      };
    });
  }

  async updateOrganization(
    id: string,
    data: UpdateOrgDTO,
    actorUserId?: string
  ): Promise<OrganizationDTO> {
    const updated = await this.orgRepo.update(id, data);
    if (!updated) {
      throw new NotFoundError(`Organization ${id} not found`);
    }

    if (actorUserId) {
      await this.auditRepo.create({
        organizationId: id,
        actorUserId,
        action: 'organization.updated',
        entityType: 'organization',
        entityId: id,
        metadata: data as Record<string, unknown>,
      });
    }

    return {
      id: updated.id,
      name: updated.name,
      slug: updated.slug,
      domain: updated.domain,
      status: updated.status,
      metadata: updated.metadata as Record<string, unknown>,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }
}
