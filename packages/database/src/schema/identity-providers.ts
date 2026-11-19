import {
  boolean,
  foreignKey,
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { organizations } from './organizations';
import { users } from './users';

export const identityProviderTypeEnum = pgEnum('idp_type', [
  'saml',
  'oidc',
  'google',
  'microsoft',
  'github',
]);

/**
 * Tenant-Owned Table: identity_providers
 * Configures enterprise SSO identity providers (SAML 2.0, OIDC, Social SSO) per organization.
 */
export const identityProviders = pgTable(
  'identity_providers',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    type: identityProviderTypeEnum('type').notNull(),
    name: varchar('name', { length: 100 }).notNull(),
    slug: varchar('slug', { length: 50 }).notNull(),
    enabled: boolean('enabled').default(true).notNull(),
    domains: text('domains').array().default([]).notNull(),
    metadata: jsonb('metadata').default({}).notNull(),
    config: jsonb('config').default({}).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique('uq_idp_org_slug').on(table.organizationId, table.slug),
    unique('uq_idp_org_id').on(table.organizationId, table.id),
    index('idx_idp_org').on(table.organizationId),
    index('idx_idp_type').on(table.type),
  ]
);

export type IdentityProvider = typeof identityProviders.$inferSelect;
export type NewIdentityProvider = typeof identityProviders.$inferInsert;

/**
 * Tenant-Owned Table: user_identities
 * Links a global user to an organization-specific Identity Provider subject.
 * Uses composite foreign key to guarantee user identity cannot link to an IdP of another organization.
 */
export const userIdentities = pgTable(
  'user_identities',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    identityProviderId: uuid('identity_provider_id').notNull(),
    externalSubjectId: varchar('external_subject_id', { length: 255 }).notNull(),
    profileData: jsonb('profile_data').default({}).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    // Composite foreign key ensuring IdP belongs to the same organization
    foreignKey({
      columns: [table.organizationId, table.identityProviderId],
      foreignColumns: [identityProviders.organizationId, identityProviders.id],
      name: 'fk_user_identities_idp_composite',
    }).onDelete('cascade'),
    // External subject id is unique per IdP
    uniqueIndex('uq_user_identities_idp_sub').on(table.identityProviderId, table.externalSubjectId),
    // A user has one linked identity per IdP in that org
    uniqueIndex('uq_user_identities_user_idp').on(
      table.organizationId,
      table.userId,
      table.identityProviderId
    ),
    index('idx_user_identities_org').on(table.organizationId),
    index('idx_user_identities_user').on(table.userId),
    index('idx_user_identities_idp').on(table.identityProviderId),
  ]
);

export type UserIdentity = typeof userIdentities.$inferSelect;
export type NewUserIdentity = typeof userIdentities.$inferInsert;
