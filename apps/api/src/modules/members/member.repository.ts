import {
  invitations,
  memberRoles,
  OrganizationMember,
  organizationMembers,
  roles,
  users,
  withTenantTransaction,
} from '@sso/database';
import { and, count, desc, eq } from 'drizzle-orm';
import { MemberResultDTO } from './member.types.js';

export class MemberRepository {
  async findByTenant(
    tenantId: string,
    page = 1,
    limit = 20
  ): Promise<{ data: MemberResultDTO[]; total: number }> {
    const offset = (page - 1) * limit;

    return withTenantTransaction(tenantId, async (tx) => {
      const memberRows = await tx
        .select({
          member: organizationMembers,
          user: users,
        })
        .from(organizationMembers)
        .innerJoin(users, eq(organizationMembers.userId, users.id))
        .where(eq(organizationMembers.organizationId, tenantId))
        .orderBy(desc(organizationMembers.createdAt))
        .limit(limit)
        .offset(offset);

      const [totalCount] = await tx
        .select({ count: count() })
        .from(organizationMembers)
        .where(eq(organizationMembers.organizationId, tenantId));

      const memberIds = memberRows.map((r) => r.member.id);
      let rolesByMember: Record<string, { id: string; name: string }[]> = {};

      if (memberIds.length > 0) {
        const roleAssignments = await tx
          .select({
            memberId: memberRoles.memberId,
            roleId: roles.id,
            roleName: roles.name,
          })
          .from(memberRoles)
          .innerJoin(roles, eq(memberRoles.roleId, roles.id))
          .where(eq(memberRoles.organizationId, tenantId));

        rolesByMember = roleAssignments.reduce(
          (acc, curr) => {
            if (!acc[curr.memberId]) acc[curr.memberId] = [];
            acc[curr.memberId]!.push({ id: curr.roleId, name: curr.roleName });
            return acc;
          },
          {} as Record<string, { id: string; name: string }[]>
        );
      }

      const results: MemberResultDTO[] = memberRows.map((r) => ({
        id: r.member.id,
        organizationId: r.member.organizationId,
        userId: r.member.userId,
        status: r.member.status,
        joinedAt: r.member.joinedAt.toISOString(),
        createdAt: r.member.createdAt.toISOString(),
        updatedAt: r.member.updatedAt.toISOString(),
        user: {
          id: r.user.id,
          email: r.user.email,
          firstName: r.user.firstName,
          lastName: r.user.lastName,
          isSuperAdmin: r.user.isSuperAdmin,
          status: r.user.status,
          createdAt: r.user.createdAt.toISOString(),
          updatedAt: r.user.updatedAt.toISOString(),
        },
        roles: rolesByMember[r.member.id] || [],
      }));

      return {
        data: results,
        total: totalCount ? Number(totalCount.count) : 0,
      };
    });
  }

  async findById(tenantId: string, id: string): Promise<OrganizationMember | null> {
    return withTenantTransaction(tenantId, async (tx) => {
      const [member] = await tx
        .select()
        .from(organizationMembers)
        .where(
          and(eq(organizationMembers.organizationId, tenantId), eq(organizationMembers.id, id))
        );
      return member || null;
    });
  }

  async updateMember(
    tenantId: string,
    id: string,
    data: { status?: 'active' | 'invited' | 'suspended'; roleIds?: string[] }
  ): Promise<OrganizationMember | null> {
    return withTenantTransaction(tenantId, async (tx) => {
      if (data.status) {
        const [updated] = await tx
          .update(organizationMembers)
          .set({ status: data.status, updatedAt: new Date() })
          .where(
            and(eq(organizationMembers.organizationId, tenantId), eq(organizationMembers.id, id))
          )
          .returning();

        if (!updated) return null;
      }

      if (data.roleIds) {
        // Clear existing member roles
        await tx
          .delete(memberRoles)
          .where(and(eq(memberRoles.organizationId, tenantId), eq(memberRoles.memberId, id)));

        // Assign new roles
        for (const roleId of data.roleIds) {
          await tx.insert(memberRoles).values({
            organizationId: tenantId,
            memberId: id,
            roleId,
          });
        }
      }

      const [final] = await tx
        .select()
        .from(organizationMembers)
        .where(
          and(eq(organizationMembers.organizationId, tenantId), eq(organizationMembers.id, id))
        );
      return final || null;
    });
  }

  async removeMember(tenantId: string, id: string): Promise<boolean> {
    return withTenantTransaction(tenantId, async (tx) => {
      const [deleted] = await tx
        .delete(organizationMembers)
        .where(
          and(eq(organizationMembers.organizationId, tenantId), eq(organizationMembers.id, id))
        )
        .returning();
      return Boolean(deleted);
    });
  }

  async createInvitation(
    tenantId: string,
    data: {
      email: string;
      roleId: string;
      invitedByUserId: string;
      token: string;
      expiresAt: Date;
    }
  ) {
    return withTenantTransaction(tenantId, async (tx) => {
      const [invitation] = await tx
        .insert(invitations)
        .values({
          organizationId: tenantId,
          email: data.email,
          roleId: data.roleId,
          invitedByUserId: data.invitedByUserId,
          token: data.token,
          expiresAt: data.expiresAt,
        })
        .returning();
      return invitation!;
    });
  }
}
