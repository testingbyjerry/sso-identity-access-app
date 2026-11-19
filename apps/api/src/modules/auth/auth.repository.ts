import {
  auditLogs,
  getDatabase,
  identityProviders,
  memberRoles,
  organizationMembers,
  organizations,
  passwordResetTokens,
  permissions,
  rolePermissions,
  roles,
  ssoTransactions,
  userIdentities,
  users,
  type IdentityProvider,
  type NewAuditLog,
  type NewPasswordResetToken,
  type NewSsoTransaction,
  type NewUser,
  type NewUserIdentity,
  type PasswordResetToken,
  type SsoTransaction,
  type User,
  type UserIdentity,
} from '@sso/database';
import { and, eq, gt, isNull, sql } from 'drizzle-orm';

export class AuthRepository {
  private get db() {
    return getDatabase();
  }

  async findUserByEmail(email: string): Promise<User | null> {
    const [user] = await this.db
      .select()
      .from(users)
      .where(sql`lower(${users.email}) = lower(${email})`);

    return user || null;
  }

  async findUserById(id: string): Promise<User | null> {
    const [user] = await this.db.select().from(users).where(eq(users.id, id));
    return user || null;
  }

  async createUser(data: NewUser): Promise<User> {
    const [created] = await this.db.insert(users).values(data).returning();
    if (!created) throw new Error('Failed to create user');
    return created;
  }

  async updateUserPassword(userId: string, passwordHash: string): Promise<User | null> {
    const [updated] = await this.db
      .update(users)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();

    return updated || null;
  }

  // Password reset tokens
  async createPasswordResetToken(data: NewPasswordResetToken): Promise<PasswordResetToken> {
    const [created] = await this.db.insert(passwordResetTokens).values(data).returning();
    if (!created) throw new Error('Failed to create password reset token');
    return created;
  }

  async findValidPasswordResetToken(tokenHash: string): Promise<PasswordResetToken | null> {
    const [token] = await this.db
      .select()
      .from(passwordResetTokens)
      .where(
        and(
          eq(passwordResetTokens.tokenHash, tokenHash),
          isNull(passwordResetTokens.usedAt),
          gt(passwordResetTokens.expiresAt, new Date())
        )
      );

    return token || null;
  }

  async markPasswordResetTokenUsed(id: string): Promise<void> {
    await this.db
      .update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(eq(passwordResetTokens.id, id));
  }

  // SSO Transactions
  async createSsoTransaction(data: NewSsoTransaction): Promise<SsoTransaction> {
    const [created] = await this.db.insert(ssoTransactions).values(data).returning();
    if (!created) throw new Error('Failed to create SSO transaction');
    return created;
  }

  async findSsoTransactionByState(state: string): Promise<SsoTransaction | null> {
    const [tx] = await this.db
      .select()
      .from(ssoTransactions)
      .where(eq(ssoTransactions.state, state));

    return tx || null;
  }

  async updateSsoTransactionStatus(
    id: string,
    status: 'pending' | 'completed' | 'failed' | 'expired'
  ): Promise<SsoTransaction | null> {
    const [updated] = await this.db
      .update(ssoTransactions)
      .set({ status })
      .where(eq(ssoTransactions.id, id))
      .returning();

    return updated || null;
  }

  // Identity Providers
  async findIdentityProviderById(id: string): Promise<IdentityProvider | null> {
    const [idp] = await this.db
      .select()
      .from(identityProviders)
      .where(eq(identityProviders.id, id));

    return idp || null;
  }

  async findIdentityProviderByDomainOrSlug(query: string): Promise<IdentityProvider | null> {
    const cleanQuery = query.toLowerCase().trim();

    // 1. Try finding by slug
    const [bySlug] = await this.db
      .select()
      .from(identityProviders)
      .where(and(eq(identityProviders.slug, cleanQuery), eq(identityProviders.enabled, true)));

    if (bySlug) return bySlug;

    // 2. Try finding by email domain (e.g. if query is 'alice@acme.com', extract 'acme.com')
    const domain = cleanQuery.includes('@') ? (cleanQuery.split('@')[1] || '') : cleanQuery;

    const allEnabled = await this.db
      .select()
      .from(identityProviders)
      .where(eq(identityProviders.enabled, true));

    for (const idp of allEnabled) {
      if (Array.isArray(idp.domains) && idp.domains.map((d) => d.toLowerCase()).includes(domain)) {
        return idp;
      }
    }

    return null;
  }

  // User identities (linked external subjects)
  async findUserIdentity(
    identityProviderId: string,
    externalSubjectId: string
  ): Promise<UserIdentity | null> {
    const [identity] = await this.db
      .select()
      .from(userIdentities)
      .where(
        and(
          eq(userIdentities.identityProviderId, identityProviderId),
          eq(userIdentities.externalSubjectId, externalSubjectId)
        )
      );

    return identity || null;
  }

  async createUserIdentity(data: NewUserIdentity): Promise<UserIdentity> {
    const [created] = await this.db.insert(userIdentities).values(data).returning();
    if (!created) throw new Error('Failed to create user identity');
    return created;
  }

  // User memberships and roles across organizations
  async getUserOrganizations(userId: string) {
    const memberships = await this.db
      .select({
        organizationId: organizations.id,
        organizationName: organizations.name,
        organizationSlug: organizations.slug,
        memberId: organizationMembers.id,
        memberStatus: organizationMembers.status,
      })
      .from(organizationMembers)
      .innerJoin(organizations, eq(organizationMembers.organizationId, organizations.id))
      .where(
        and(eq(organizationMembers.userId, userId), eq(organizationMembers.status, 'active'))
      );

    const result = [];
    for (const m of memberships) {
      const rolesData = await this.db
        .select({
          roleName: roles.name,
          permissionKey: permissions.key,
        })
        .from(memberRoles)
        .innerJoin(roles, eq(memberRoles.roleId, roles.id))
        .leftJoin(rolePermissions, eq(roles.id, rolePermissions.roleId))
        .leftJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
        .where(eq(memberRoles.memberId, m.memberId));

      result.push({
        organizationId: m.organizationId,
        organizationName: m.organizationName,
        organizationSlug: m.organizationSlug,
        roles: Array.from(new Set(rolesData.map((r) => r.roleName))),
        permissions: Array.from(
          new Set(rolesData.map((r) => r.permissionKey).filter((k): k is string => Boolean(k)))
        ),
      });
    }

    return result;
  }

  // Audit logging helper
  async createAuditLog(data: NewAuditLog): Promise<void> {
    await this.db.insert(auditLogs).values(data);
  }
}

export const authRepository = new AuthRepository();
