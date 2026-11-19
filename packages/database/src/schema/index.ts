import { relations } from 'drizzle-orm';
import { passwordResetTokens, sessions, ssoTransactions } from './auth';
import { auditLogs } from './audit-logs';
import { identityProviders, userIdentities } from './identity-providers';
import { invitations } from './invitations';
import { organizationMembers } from './members';
import { organizations } from './organizations';
import { permissions } from './permissions';
import { memberRoles, rolePermissions, roles } from './roles';
import { users } from './users';

// Export all tables and types
export * from './audit-logs';
export * from './auth';
export * from './identity-providers';
export * from './invitations';
export * from './members';
export * from './organizations';
export * from './permissions';
export * from './roles';
export * from './users';

// Define Table Relations
export const organizationsRelations = relations(organizations, ({ many }) => ({
  members: many(organizationMembers),
  roles: many(roles),
  identityProviders: many(identityProviders),
  invitations: many(invitations),
  auditLogs: many(auditLogs),
  ssoTransactions: many(ssoTransactions),
}));

export const usersRelations = relations(users, ({ many }) => ({
  memberships: many(organizationMembers),
  userIdentities: many(userIdentities),
  sessions: many(sessions),
  auditLogs: many(auditLogs),
}));

export const organizationMembersRelations = relations(organizationMembers, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [organizationMembers.organizationId],
    references: [organizations.id],
  }),
  user: one(users, {
    fields: [organizationMembers.userId],
    references: [users.id],
  }),
  memberRoles: many(memberRoles),
}));

export const rolesRelations = relations(roles, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [roles.organizationId],
    references: [organizations.id],
  }),
  rolePermissions: many(rolePermissions),
  memberRoles: many(memberRoles),
}));

export const permissionsRelations = relations(permissions, ({ many }) => ({
  rolePermissions: many(rolePermissions),
}));

export const rolePermissionsRelations = relations(rolePermissions, ({ one }) => ({
  role: one(roles, {
    fields: [rolePermissions.roleId],
    references: [roles.id],
  }),
  permission: one(permissions, {
    fields: [rolePermissions.permissionId],
    references: [permissions.id],
  }),
}));

export const memberRolesRelations = relations(memberRoles, ({ one }) => ({
  member: one(organizationMembers, {
    fields: [memberRoles.memberId],
    references: [organizationMembers.id],
  }),
  role: one(roles, {
    fields: [memberRoles.roleId],
    references: [roles.id],
  }),
}));

export const identityProvidersRelations = relations(identityProviders, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [identityProviders.organizationId],
    references: [organizations.id],
  }),
  userIdentities: many(userIdentities),
  ssoTransactions: many(ssoTransactions),
}));

export const userIdentitiesRelations = relations(userIdentities, ({ one }) => ({
  organization: one(organizations, {
    fields: [userIdentities.organizationId],
    references: [organizations.id],
  }),
  user: one(users, {
    fields: [userIdentities.userId],
    references: [users.id],
  }),
  identityProvider: one(identityProviders, {
    fields: [userIdentities.identityProviderId],
    references: [identityProviders.id],
  }),
}));

export const invitationsRelations = relations(invitations, ({ one }) => ({
  organization: one(organizations, {
    fields: [invitations.organizationId],
    references: [organizations.id],
  }),
  role: one(roles, {
    fields: [invitations.roleId],
    references: [roles.id],
  }),
  invitedBy: one(users, {
    fields: [invitations.invitedByUserId],
    references: [users.id],
  }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  organization: one(organizations, {
    fields: [auditLogs.organizationId],
    references: [organizations.id],
  }),
  actor: one(users, {
    fields: [auditLogs.actorUserId],
    references: [users.id],
  }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
  activeOrganization: one(organizations, {
    fields: [sessions.activeOrganizationId],
    references: [organizations.id],
  }),
}));

export const ssoTransactionsRelations = relations(ssoTransactions, ({ one }) => ({
  organization: one(organizations, {
    fields: [ssoTransactions.organizationId],
    references: [organizations.id],
  }),
  identityProvider: one(identityProviders, {
    fields: [ssoTransactions.identityProviderId],
    references: [identityProviders.id],
  }),
}));

export const passwordResetTokensRelations = relations(passwordResetTokens, ({ one }) => ({
  user: one(users, {
    fields: [passwordResetTokens.userId],
    references: [users.id],
  }),
}));
