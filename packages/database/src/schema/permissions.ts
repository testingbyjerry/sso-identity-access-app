import { index, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';

/**
 * Global Platform Table: permissions
 * Platform-wide catalog of granular capabilities.
 */
export const permissions = pgTable(
  'permissions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    key: varchar('key', { length: 100 }).notNull(),
    description: text('description'),
    category: varchar('category', { length: 50 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('uq_permissions_key').on(table.key),
    index('idx_permissions_category').on(table.category),
  ]
);

export type Permission = typeof permissions.$inferSelect;
export type NewPermission = typeof permissions.$inferInsert;
