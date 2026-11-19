import { index, pgEnum, pgTable, timestamp, unique, uuid } from 'drizzle-orm/pg-core';
import { organizations } from './organizations';
import { users } from './users';

export const memberStatusEnum = pgEnum('member_status', ['active', 'invited', 'suspended']);

/**
 * Tenant-Owned Table: organization_members
 * Scoped to an organization. Associates global users with a tenant.
 */
export const organizationMembers = pgTable(
  'organization_members',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    status: memberStatusEnum('status').default('active').notNull(),
    joinedAt: timestamp('joined_at', { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    // Ensure a user cannot be added twice to the same organization
    unique('uq_org_members_user').on(table.organizationId, table.userId),
    // Required target for composite foreign keys to ensure tenant isolation
    unique('uq_org_members_org_id').on(table.organizationId, table.id),
    index('idx_org_members_org').on(table.organizationId),
    index('idx_org_members_user').on(table.userId),
  ]
);

export type OrganizationMember = typeof organizationMembers.$inferSelect;
export type NewOrganizationMember = typeof organizationMembers.$inferInsert;
