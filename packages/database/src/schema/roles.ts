import {
  boolean,
  foreignKey,
  index,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { organizationMembers } from './members';
import { organizations } from './organizations';
import { permissions } from './permissions';

/**
 * Tenant-Owned Table: roles
 * Scoped to an organization. Defines role names within a tenant.
 */
export const roles = pgTable(
  'roles',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 100 }).notNull(),
    description: text('description'),
    isSystem: boolean('is_system').default(false).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    // Role names are unique per organization
    unique('uq_roles_org_name').on(table.organizationId, table.name),
    // Composite target for child tenant-scoped composite foreign keys
    unique('uq_roles_org_id').on(table.organizationId, table.id),
    index('idx_roles_org').on(table.organizationId),
  ]
);

export type Role = typeof roles.$inferSelect;
export type NewRole = typeof roles.$inferInsert;

/**
 * Tenant-Owned Table: role_permissions
 * Maps permissions to roles.
 * Uses composite foreign key to guarantee permissions are only assigned to roles belonging to the same tenant.
 */
export const rolePermissions = pgTable(
  'role_permissions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    roleId: uuid('role_id').notNull(),
    permissionId: uuid('permission_id')
      .notNull()
      .references(() => permissions.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    // Composite foreign key ensuring roleId belongs to the same organizationId
    foreignKey({
      columns: [table.organizationId, table.roleId],
      foreignColumns: [roles.organizationId, roles.id],
      name: 'fk_role_permissions_role_composite',
    }).onDelete('cascade'),
    // Prevent duplicate permission on the same role
    uniqueIndex('uq_role_permissions_role_perm').on(table.roleId, table.permissionId),
    index('idx_role_permissions_org').on(table.organizationId),
    index('idx_role_permissions_role').on(table.roleId),
    index('idx_role_permissions_perm').on(table.permissionId),
  ]
);

export type RolePermission = typeof rolePermissions.$inferSelect;
export type NewRolePermission = typeof rolePermissions.$inferInsert;

/**
 * Tenant-Owned Table: member_roles
 * Assigns roles to organization members.
 * Uses dual composite foreign keys to guarantee cross-tenant role assignment is mathematically impossible.
 */
export const memberRoles = pgTable(
  'member_roles',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    memberId: uuid('member_id').notNull(),
    roleId: uuid('role_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    // Composite FK 1: guarantees member belongs to the same organization
    foreignKey({
      columns: [table.organizationId, table.memberId],
      foreignColumns: [organizationMembers.organizationId, organizationMembers.id],
      name: 'fk_member_roles_member_composite',
    }).onDelete('cascade'),
    // Composite FK 2: guarantees role belongs to the same organization
    foreignKey({
      columns: [table.organizationId, table.roleId],
      foreignColumns: [roles.organizationId, roles.id],
      name: 'fk_member_roles_role_composite',
    }).onDelete('cascade'),
    // Prevent duplicate role assigned to same member
    uniqueIndex('uq_member_roles_member_role').on(table.memberId, table.roleId),
    index('idx_member_roles_org').on(table.organizationId),
    index('idx_member_roles_member').on(table.memberId),
    index('idx_member_roles_role').on(table.roleId),
  ]
);

export type MemberRole = typeof memberRoles.$inferSelect;
export type NewMemberRole = typeof memberRoles.$inferInsert;
