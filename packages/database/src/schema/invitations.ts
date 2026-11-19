import {
  foreignKey,
  index,
  pgEnum,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { organizations } from './organizations';
import { roles } from './roles';
import { users } from './users';

export const invitationStatusEnum = pgEnum('invitation_status', [
  'pending',
  'accepted',
  'revoked',
  'expired',
]);

/**
 * Tenant-Owned Table: invitations
 * Organization membership invitations sent to emails.
 * Uses composite foreign key to guarantee invited role belongs to the inviting organization.
 */
export const invitations = pgTable(
  'invitations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    email: varchar('email', { length: 255 }).notNull(),
    roleId: uuid('role_id').notNull(),
    invitedByUserId: uuid('invited_by_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    token: varchar('token', { length: 255 }).notNull(),
    status: invitationStatusEnum('status').default('pending').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    // Composite FK ensuring assigned role belongs to the same organization
    foreignKey({
      columns: [table.organizationId, table.roleId],
      foreignColumns: [roles.organizationId, roles.id],
      name: 'fk_invitations_role_composite',
    }).onDelete('cascade'),
    uniqueIndex('uq_invitations_token').on(table.token),
    index('idx_invitations_org').on(table.organizationId),
    index('idx_invitations_email').on(table.email),
    index('idx_invitations_status').on(table.status),
  ]
);

export type Invitation = typeof invitations.$inferSelect;
export type NewInvitation = typeof invitations.$inferInsert;
