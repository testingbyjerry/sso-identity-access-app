import { permissions, rolePermissions, roles, withTenantTransaction } from '@sso/database';
import { and, eq } from 'drizzle-orm';
import { CreateRoleDTO, RoleResultDTO, UpdateRoleDTO } from './role.types.js';

export class RoleRepository {
  async findByTenant(tenantId: string): Promise<RoleResultDTO[]> {
    return withTenantTransaction(tenantId, async (tx) => {
      const roleRows = await tx
        .select()
        .from(roles)
        .where(eq(roles.organizationId, tenantId))
        .orderBy(roles.name);

      const roleIds = roleRows.map((r) => r.id);
      let permsByRole: Record<string, string[]> = {};

      if (roleIds.length > 0) {
        const perms = await tx
          .select({
            roleId: rolePermissions.roleId,
            permissionKey: permissions.key,
          })
          .from(rolePermissions)
          .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
          .where(eq(rolePermissions.organizationId, tenantId));

        permsByRole = perms.reduce(
          (acc, curr) => {
            if (!acc[curr.roleId]) acc[curr.roleId] = [];
            acc[curr.roleId]!.push(curr.permissionKey);
            return acc;
          },
          {} as Record<string, string[]>
        );
      }

      return roleRows.map((r) => ({
        id: r.id,
        organizationId: r.organizationId,
        name: r.name,
        description: r.description,
        isSystem: r.isSystem,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
        permissions: permsByRole[r.id] || [],
      }));
    });
  }

  async findById(tenantId: string, id: string): Promise<RoleResultDTO | null> {
    return withTenantTransaction(tenantId, async (tx) => {
      const [role] = await tx
        .select()
        .from(roles)
        .where(and(eq(roles.organizationId, tenantId), eq(roles.id, id)));

      if (!role) return null;

      const perms = await tx
        .select({ permissionKey: permissions.key })
        .from(rolePermissions)
        .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
        .where(
          and(eq(rolePermissions.organizationId, tenantId), eq(rolePermissions.roleId, role.id))
        );

      return {
        id: role.id,
        organizationId: role.organizationId,
        name: role.name,
        description: role.description,
        isSystem: role.isSystem,
        createdAt: role.createdAt.toISOString(),
        updatedAt: role.updatedAt.toISOString(),
        permissions: perms.map((p) => p.permissionKey),
      };
    });
  }

  async create(tenantId: string, data: CreateRoleDTO): Promise<RoleResultDTO> {
    return withTenantTransaction(tenantId, async (tx) => {
      const [created] = await tx
        .insert(roles)
        .values({
          organizationId: tenantId,
          name: data.name,
          description: data.description,
          isSystem: false,
        })
        .returning();

      const permissionKeys = data.permissionKeys || [];
      if (permissionKeys.length > 0) {
        const matchingPerms = await tx.select().from(permissions);

        const permMap = new Map(matchingPerms.map((p) => [p.key, p.id]));

        for (const key of permissionKeys) {
          const permId = permMap.get(key);
          if (permId) {
            await tx.insert(rolePermissions).values({
              organizationId: tenantId,
              roleId: created!.id,
              permissionId: permId,
            });
          }
        }
      }

      return {
        id: created!.id,
        organizationId: created!.organizationId,
        name: created!.name,
        description: created!.description,
        isSystem: created!.isSystem,
        createdAt: created!.createdAt.toISOString(),
        updatedAt: created!.updatedAt.toISOString(),
        permissions: permissionKeys,
      };
    });
  }

  async update(tenantId: string, id: string, data: UpdateRoleDTO): Promise<RoleResultDTO | null> {
    return withTenantTransaction(tenantId, async (tx) => {
      const [updated] = await tx
        .update(roles)
        .set({
          name: data.name,
          description: data.description,
          updatedAt: new Date(),
        })
        .where(and(eq(roles.organizationId, tenantId), eq(roles.id, id)))
        .returning();

      if (!updated) return null;

      if (data.permissionKeys) {
        await tx
          .delete(rolePermissions)
          .where(and(eq(rolePermissions.organizationId, tenantId), eq(rolePermissions.roleId, id)));

        const allPerms = await tx.select().from(permissions);
        const permMap = new Map(allPerms.map((p) => [p.key, p.id]));

        for (const key of data.permissionKeys) {
          const permId = permMap.get(key);
          if (permId) {
            await tx.insert(rolePermissions).values({
              organizationId: tenantId,
              roleId: id,
              permissionId: permId,
            });
          }
        }
      }

      return this.findById(tenantId, id);
    });
  }

  async delete(tenantId: string, id: string): Promise<boolean> {
    return withTenantTransaction(tenantId, async (tx) => {
      const [deleted] = await tx
        .delete(roles)
        .where(
          and(
            eq(roles.organizationId, tenantId),
            eq(roles.id, id),
            eq(roles.isSystem, false) // System roles cannot be deleted
          )
        )
        .returning();
      return Boolean(deleted);
    });
  }
}
