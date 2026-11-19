import {
  foreignKey,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { identityProviders } from './identity-providers';
import { organizations } from './organizations';
import { users } from './users';

export const ssoTransactionStatusEnum = pgEnum('sso_transaction_status', [
  'pending',
  'completed',
  'failed',
  'expired',
]);

/**
 * Authentication Table: sessions
 * Tracks active user authentication sessions across the platform.
 */
export const sessions = pgTable(
  'sessions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    activeOrganizationId: uuid('active_organization_id').references(() => organizations.id, {
      onDelete: 'set null',
    }),
    tokenHash: varchar('token_hash', { length: 255 }).notNull(),
    userAgent: text('user_agent'),
    ipAddress: varchar('ip_address', { length: 45 }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('uq_sessions_token_hash').on(table.tokenHash),
    index('idx_sessions_user').on(table.userId),
    index('idx_sessions_org').on(table.activeOrganizationId),
    index('idx_sessions_expires').on(table.expiresAt),
  ]
);

export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;

/**
 * Tenant-Owned Authentication Table: sso_transactions
 * Tracks ephemeral OIDC/SAML in-flight authentication states, PKCE verifiers, and nonces.
 * Uses composite foreign key to guarantee transaction references an IdP belonging to that organization.
 */
export const ssoTransactions = pgTable(
  'sso_transactions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    identityProviderId: uuid('identity_provider_id').notNull(),
    state: varchar('state', { length: 255 }).notNull(),
    nonce: varchar('nonce', { length: 255 }),
    codeVerifier: varchar('code_verifier', { length: 255 }),
    redirectUri: text('redirect_uri').notNull(),
    status: ssoTransactionStatusEnum('status').default('pending').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    // Composite FK ensuring IdP belongs to the same organization
    foreignKey({
      columns: [table.organizationId, table.identityProviderId],
      foreignColumns: [identityProviders.organizationId, identityProviders.id],
      name: 'fk_sso_tx_idp_composite',
    }).onDelete('cascade'),
    uniqueIndex('uq_sso_tx_state').on(table.state),
    index('idx_sso_tx_org').on(table.organizationId),
    index('idx_sso_tx_idp').on(table.identityProviderId),
    index('idx_sso_tx_expires').on(table.expiresAt),
  ]
);

export type SsoTransaction = typeof ssoTransactions.$inferSelect;
export type NewSsoTransaction = typeof ssoTransactions.$inferInsert;

/**
 * Authentication Table: password_reset_tokens
 * Secure one-time tokens for credential reset workflows.
 */
export const passwordResetTokens = pgTable(
  'password_reset_tokens',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: varchar('token_hash', { length: 255 }).notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    usedAt: timestamp('used_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('uq_password_reset_tokens_hash').on(table.tokenHash),
    index('idx_password_reset_tokens_user').on(table.userId),
    index('idx_password_reset_tokens_expires').on(table.expiresAt),
  ]
);

export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type NewPasswordResetToken = typeof passwordResetTokens.$inferInsert;
