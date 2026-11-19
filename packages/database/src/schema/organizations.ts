import { jsonb, pgEnum, pgTable, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';

export const organizationStatusEnum = pgEnum('organization_status', [
  'active',
  'suspended',
  'pending',
]);

/**
 * Global Platform Table: organizations
 * Root tenant boundary entity.
 */
export const organizations = pgTable(
  'organizations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 63 }).notNull(),
    domain: varchar('domain', { length: 255 }),
    status: organizationStatusEnum('status').default('active').notNull(),
    metadata: jsonb('metadata').default({}).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('uq_organizations_slug').on(table.slug),
    uniqueIndex('uq_organizations_domain').on(table.domain),
  ]
);

export type Organization = typeof organizations.$inferSelect;
export type NewOrganization = typeof organizations.$inferInsert;
