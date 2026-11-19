import {
  BadRequestError,
  CurrentUserDTO,
  ForbiddenError,
  NotFoundError,
  SessionDTO,
  SsoInitiateResult,
  UnauthorizedError,
  UserDTO,
} from '@sso/shared';
import {
  getDatabase,
  memberRoles,
  organizationMembers,
  roles,
  type Session,
  type User,
} from '@sso/database';
import {
  ForgotPasswordInput,
  LoginInput,
  ResetPasswordInput,
  SsoCallbackQuery,
  SsoStartInput,
} from '@sso/validation';
import { and, eq } from 'drizzle-orm';
import { serverConfig } from '../../config/index.js';
import {
  decryptSecret,
  generateOpaqueToken,
  generatePkce,
  hashPassword,
  hashToken,
  verifyPassword,
} from '../../common/crypto.js';
import { sessionService, SessionService } from '../sessions/session.service.js';
import { authRepository, AuthRepository } from './auth.repository.js';
import { EntraStrategy, entraStrategy } from './strategies/entra.strategy.js';
import { OktaStrategy, oktaStrategy } from './strategies/okta.strategy.js';
import { oidcStrategy, VerifiedOidcProfile } from './strategies/oidc.strategy.js';

export interface LoginResult {
  user: UserDTO;
  session: SessionDTO;
  rawToken: string;
  activeOrganizationId: string | null;
}

export class AuthService {
  constructor(
    private readonly repo: AuthRepository = authRepository,
    private readonly sessions: SessionService = sessionService
  ) {}

  /**
   * User login via email and password using Argon2id.
   * Employs generic error messages to prevent user enumeration.
   */
  async login(
    input: LoginInput,
    ipAddress?: string,
    userAgent?: string
  ): Promise<LoginResult> {
    const user = await this.repo.findUserByEmail(input.email);

    // If user does not exist or has no password hash (e.g. SSO-only user), reject generically
    if (!user || !user.passwordHash) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const isValid = await verifyPassword(user.passwordHash, input.password);
    if (!isValid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    if (user.status === 'suspended') {
      throw new ForbiddenError('User account is suspended');
    }

    // Determine active organization
    let activeOrganizationId: string | null = null;
    const userOrgs = await this.repo.getUserOrganizations(user.id);

    if (input.organizationId) {
      const isMember = userOrgs.some((o) => o.organizationId === input.organizationId);
      if (!isMember && !user.isSuperAdmin) {
        throw new ForbiddenError(
          'Access denied: You are not a member of the requested organization'
        );
      }
      activeOrganizationId = input.organizationId;
    } else if (userOrgs.length > 0 && userOrgs[0]) {
      activeOrganizationId = userOrgs[0].organizationId;
    }

    // Create session and return opaque token
    const { session, rawToken } = await this.sessions.createSession(
      user.id,
      activeOrganizationId,
      userAgent,
      ipAddress
    );

    // Security Audit Log
    if (activeOrganizationId) {
      await this.repo.createAuditLog({
        organizationId: activeOrganizationId,
        actorUserId: user.id,
        action: 'auth.login.success',
        entityType: 'session',
        entityId: session.id,
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
        metadata: { method: 'password' },
      });
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isSuperAdmin: user.isSuperAdmin,
        status: user.status,
        emailVerifiedAt: user.emailVerifiedAt ? user.emailVerifiedAt.toISOString() : null,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      },
      session: {
        id: session.id,
        userId: session.userId,
        activeOrganizationId: session.activeOrganizationId,
        userAgent: session.userAgent,
        ipAddress: session.ipAddress,
        expiresAt: session.expiresAt.toISOString(),
        createdAt: session.createdAt.toISOString(),
        updatedAt: session.updatedAt.toISOString(),
      },
      rawToken,
      activeOrganizationId,
    };
  }

  /**
   * Logout and terminate the current session.
   */
  async logout(
    sessionId: string,
    userId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    const session = await this.sessions.getUserSessions(userId);
    const targetSession = session.find((s) => s.id === sessionId);

    await this.sessions.revokeSession(sessionId, userId);

    if (targetSession?.activeOrganizationId) {
      await this.repo.createAuditLog({
        organizationId: targetSession.activeOrganizationId,
        actorUserId: userId,
        action: 'auth.logout',
        entityType: 'session',
        entityId: sessionId,
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
        metadata: {},
      });
    }
  }

  /**
   * Request password recovery token.
   * Always returns a generic success message without leaking whether the email exists.
   */
  async forgotPassword(
    input: ForgotPasswordInput,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ message: string; resetToken?: string }> {
    const genericMessage =
      'If an account exists with this email, a password reset link has been sent.';

    const user = await this.repo.findUserByEmail(input.email);
    if (!user || user.status === 'suspended') {
      return { message: genericMessage };
    }

    // Generate single-use opaque token and store hash in DB with 1 hour expiration
    const rawResetToken = generateOpaqueToken(32);
    const tokenHash = hashToken(rawResetToken);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await this.repo.createPasswordResetToken({
      userId: user.id,
      tokenHash,
      expiresAt,
    });

    const userOrgs = await this.repo.getUserOrganizations(user.id);
    const orgId = userOrgs[0]?.organizationId;
    if (orgId) {
      await this.repo.createAuditLog({
        organizationId: orgId,
        actorUserId: user.id,
        action: 'auth.password_reset.requested',
        entityType: 'user',
        entityId: user.id,
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
        metadata: {},
      });
    }

    // In test or development environments, return resetToken to facilitate automated testing
    return {
      message: genericMessage,
      resetToken: serverConfig.isTest ? rawResetToken : undefined,
    };
  }

  /**
   * Reset user password using verified single-use token.
   * Hashes new password with Argon2id, marks token used, and terminates active sessions.
   */
  async resetPassword(
    input: ResetPasswordInput,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ message: string }> {
    const tokenHash = hashToken(input.token);
    const resetRecord = await this.repo.findValidPasswordResetToken(tokenHash);

    if (!resetRecord) {
      throw new BadRequestError('Invalid or expired password reset token');
    }

    // 1. Hash new password with Argon2id
    const newPasswordHash = await hashPassword(input.newPassword);

    // 2. Update user record
    await this.repo.updateUserPassword(resetRecord.userId, newPasswordHash);

    // 3. Mark token as consumed
    await this.repo.markPasswordResetTokenUsed(resetRecord.id);

    // 4. Invalidate all active user sessions to force re-authentication
    await this.sessions.revokeAllUserSessions(resetRecord.userId);

    // 5. Audit log
    const userOrgs = await this.repo.getUserOrganizations(resetRecord.userId);
    const orgId = userOrgs[0]?.organizationId;
    if (orgId) {
      await this.repo.createAuditLog({
        organizationId: orgId,
        actorUserId: resetRecord.userId,
        action: 'auth.password_reset.completed',
        entityType: 'user',
        entityId: resetRecord.userId,
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
        metadata: {},
      });
    }

    return { message: 'Password has been successfully reset. Please log in with your new credentials.' };
  }

  /**
   * Switch the active organization for the current session.
   */
  async switchOrganization(
    sessionId: string,
    userId: string,
    targetOrganizationId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ session: SessionDTO; rawToken: string }> {
    const { session, rawToken } = await this.sessions.switchOrganization(
      sessionId,
      userId,
      targetOrganizationId
    );

    await this.repo.createAuditLog({
      organizationId: targetOrganizationId,
      actorUserId: userId,
      action: 'auth.organization.switched',
      entityType: 'session',
      entityId: sessionId,
      ipAddress: ipAddress || null,
      userAgent: userAgent || null,
      metadata: { newOrganizationId: targetOrganizationId },
    });

    return {
      session: {
        id: session.id,
        userId: session.userId,
        activeOrganizationId: session.activeOrganizationId,
        userAgent: session.userAgent,
        ipAddress: session.ipAddress,
        expiresAt: session.expiresAt.toISOString(),
        createdAt: session.createdAt.toISOString(),
        updatedAt: session.updatedAt.toISOString(),
      },
      rawToken,
    };
  }

  /**
   * Get authenticated user profile with organization memberships and roles.
   */
  async getCurrentUser(user: User, currentSession?: Session): Promise<CurrentUserDTO> {
    const organizations = await this.repo.getUserOrganizations(user.id);

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      isSuperAdmin: user.isSuperAdmin,
      status: user.status,
      emailVerifiedAt: user.emailVerifiedAt ? user.emailVerifiedAt.toISOString() : null,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
      organizations,
      activeOrganizationId: currentSession?.activeOrganizationId || null,
    };
  }

  // ==============================================================================
  // Enterprise SSO (OIDC / Entra / Okta) Flow
  // ==============================================================================

  /**
   * Discover available identity provider for an organization by domain or slug.
   */
  async ssoDiscover(query: string) {
    const idp = await this.repo.findIdentityProviderByDomainOrSlug(query);
    if (!idp) {
      throw new NotFoundError('No enabled identity provider found for the specified domain or slug');
    }

    return {
      id: idp.id,
      name: idp.name,
      slug: idp.slug,
      type: idp.type,
      organizationId: idp.organizationId,
      domains: idp.domains,
    };
  }

  /**
   * Initiate an enterprise SSO transaction with PKCE and state/nonce protection.
   */
  async ssoStart(
    input: SsoStartInput,
    _ipAddress?: string,
    _userAgent?: string
  ): Promise<SsoInitiateResult> {
    const idp = await this.repo.findIdentityProviderById(input.providerId);
    if (!idp || !idp.enabled) {
      throw new BadRequestError('Identity provider not found or is currently disabled');
    }

    const config = (idp.config || {}) as Record<string, unknown>;
    const clientId = typeof config.clientId === 'string' ? config.clientId : '';
    if (!clientId) {
      throw new BadRequestError('Identity provider configuration is missing clientId');
    }

    // 1. Generate PKCE parameters and cryptographic state/nonce
    const pkce = generatePkce();
    const state = generateOpaqueToken(32);
    const nonce = generateOpaqueToken(32);
    const redirectUri =
      input.redirectUri ||
      (typeof config.redirectUri === 'string' ? config.redirectUri : undefined) ||
      `${serverConfig.appUrl}/api/v1/auth/sso/callback`;

    // 2. Persist in-flight transaction in PostgreSQL with 10 minutes expiry
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    await this.repo.createSsoTransaction({
      organizationId: idp.organizationId,
      identityProviderId: idp.id,
      state,
      nonce,
      codeVerifier: pkce.codeVerifier,
      redirectUri,
      status: 'pending',
      expiresAt,
    });

    // 3. Resolve authorization endpoint according to provider strategy
    let authorizationEndpoint = '';
    const scopes = Array.isArray(config.scopes) ? config.scopes.join(' ') : 'openid profile email';
    const configIssuer = typeof config.issuer === 'string' ? config.issuer : undefined;
    const configTenantId = typeof config.tenantId === 'string' ? config.tenantId : undefined;
    const configOktaDomain = typeof config.oktaDomain === 'string' ? config.oktaDomain : '';
    const configAuthServerId = typeof config.authServerId === 'string' ? config.authServerId : undefined;

    if (idp.type === 'microsoft') {
      const issuer = configIssuer || EntraStrategy.getIssuerUrl(configTenantId);
      const metadata = await entraStrategy.discover(issuer);
      authorizationEndpoint = metadata.authorization_endpoint;
    } else if ((idp.type as string) === 'okta' || (idp.type === 'oidc' && Boolean(configOktaDomain))) {
      const issuer = configIssuer || OktaStrategy.getIssuerUrl(configOktaDomain, configAuthServerId);
      const metadata = await oktaStrategy.discover(issuer);
      authorizationEndpoint = metadata.authorization_endpoint;
    } else if (idp.type === 'oidc' || idp.type === 'google') {
      if (!configIssuer) {
        throw new BadRequestError('OIDC provider configuration is missing issuer URL');
      }
      const metadata = await oidcStrategy.discover(configIssuer);
      authorizationEndpoint = metadata.authorization_endpoint;
    } else {
      // Fallback or generic OIDC
      if (!configIssuer) {
        throw new BadRequestError('OIDC provider configuration is missing issuer URL');
      }
      const metadata = await oidcStrategy.discover(configIssuer);
      authorizationEndpoint = metadata.authorization_endpoint;
    }

    const authorizationUrl = oidcStrategy.buildAuthorizationUrl({
      authorizationEndpoint,
      clientId,
      redirectUri,
      scope: scopes,
      state,
      nonce,
      codeChallenge: pkce.codeChallenge,
      codeChallengeMethod: 'S256',
    });

    return {
      authorizationUrl,
      state,
    };
  }

  /**
   * Handle the OIDC authorization callback:
   * 1. Validates and marks the state single-use.
   * 2. Exchanges code and PKCE code_verifier for tokens.
   * 3. Validates ID token cryptographic signature, issuer, audience, and nonce via JWKS.
   * 4. Provisions or links user and organization membership (JIT provisioning).
   * 5. Creates authenticated session.
   */
  async ssoCallback(
    input: SsoCallbackQuery,
    ipAddress?: string,
    userAgent?: string
  ): Promise<LoginResult> {
    const tx = await this.repo.findSsoTransactionByState(input.state);

    if (!tx) {
      throw new BadRequestError('Invalid or expired SSO state parameter');
    }

    if (tx.status !== 'pending') {
      throw new BadRequestError('SSO transaction has already been completed or expired (replay prevented)');
    }

    if (tx.expiresAt < new Date()) {
      await this.repo.updateSsoTransactionStatus(tx.id, 'expired');
      throw new BadRequestError('SSO transaction has expired');
    }

    // Atomically mark transaction completed to prevent replay attacks
    await this.repo.updateSsoTransactionStatus(tx.id, 'completed');

    // Retrieve Identity Provider
    const idp = await this.repo.findIdentityProviderById(tx.identityProviderId);
    if (!idp || !idp.enabled) {
      throw new BadRequestError('Identity provider configuration is not active');
    }

    const config = (idp.config || {}) as Record<string, unknown>;
    const clientId = typeof config.clientId === 'string' ? config.clientId : '';
    const encryptedSecret = typeof config.clientSecret === 'string' ? config.clientSecret : '';

    if (!clientId || !encryptedSecret) {
      throw new BadRequestError('Incomplete identity provider credentials');
    }

    // Decrypt provider client secret
    let clientSecret = '';
    try {
      clientSecret = decryptSecret(encryptedSecret);
    } catch {
      // If it was stored unencrypted in tests/dev, fallback
      clientSecret = encryptedSecret;
    }

    // Resolve provider strategy & endpoints
    let strategy: typeof oidcStrategy = oidcStrategy;
    const configIssuer = typeof config.issuer === 'string' ? config.issuer : '';
    const configTenantId = typeof config.tenantId === 'string' ? config.tenantId : undefined;
    const configOktaDomain = typeof config.oktaDomain === 'string' ? config.oktaDomain : '';
    const configAuthServerId = typeof config.authServerId === 'string' ? config.authServerId : undefined;
    let issuer = configIssuer;

    if (idp.type === 'microsoft') {
      strategy = entraStrategy;
      issuer = configIssuer || EntraStrategy.getIssuerUrl(configTenantId);
    } else if ((idp.type as string) === 'okta' || (idp.type === 'oidc' && Boolean(configOktaDomain))) {
      strategy = oktaStrategy;
      issuer = configIssuer || OktaStrategy.getIssuerUrl(configOktaDomain, configAuthServerId);
    }

    const metadata = await strategy.discover(issuer);

    // Exchange authorization code with PKCE code_verifier
    const tokens = await strategy.exchangeCode({
      tokenEndpoint: metadata.token_endpoint,
      clientId,
      clientSecret,
      code: input.code,
      redirectUri: tx.redirectUri,
      codeVerifier: tx.codeVerifier || undefined,
    });

    if (!tokens.id_token) {
      throw new BadRequestError('Provider did not return an ID token');
    }

    // Cryptographically verify ID Token signature, audience, issuer, expiration, and nonce
    const verifiedProfile = await strategy.verifyIdToken({
      idToken: tokens.id_token,
      jwksUri: metadata.jwks_uri,
      expectedIssuer: metadata.issuer,
      expectedAudience: clientId,
      expectedNonce: tx.nonce || undefined,
    });

    // Resolve or provision global user and organization membership
    const defaultRoleId = typeof config.defaultRoleId === 'string' ? config.defaultRoleId : undefined;
    const user = await this.provisionOrLinkSsoUser(
      tx.organizationId,
      idp.id,
      verifiedProfile,
      config.jitEnabled !== false,
      defaultRoleId
    );

    // Create session
    const { session, rawToken } = await this.sessions.createSession(
      user.id,
      tx.organizationId,
      userAgent,
      ipAddress
    );

    // Security Audit Log
    await this.repo.createAuditLog({
      organizationId: tx.organizationId,
      actorUserId: user.id,
      action: 'sso.login.success',
      entityType: 'session',
      entityId: session.id,
      ipAddress: ipAddress || null,
      userAgent: userAgent || null,
      metadata: {
        providerId: idp.id,
        providerType: idp.type,
        externalSubjectId: verifiedProfile.externalSubjectId,
      },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isSuperAdmin: user.isSuperAdmin,
        status: user.status,
        emailVerifiedAt: user.emailVerifiedAt ? user.emailVerifiedAt.toISOString() : null,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      },
      session: {
        id: session.id,
        userId: session.userId,
        activeOrganizationId: session.activeOrganizationId,
        userAgent: session.userAgent,
        ipAddress: session.ipAddress,
        expiresAt: session.expiresAt.toISOString(),
        createdAt: session.createdAt.toISOString(),
        updatedAt: session.updatedAt.toISOString(),
      },
      rawToken,
      activeOrganizationId: tx.organizationId,
    };
  }

  /**
   * Helper: provisions or links user and organization membership via JIT policy.
   */
  private async provisionOrLinkSsoUser(
    organizationId: string,
    providerId: string,
    profile: VerifiedOidcProfile,
    jitEnabled: boolean,
    defaultRoleId?: string
  ): Promise<User> {
    const db = getDatabase();

    // 1. Check if user already exists by email
    let user = await this.repo.findUserByEmail(profile.email);

    if (!user) {
      if (!jitEnabled) {
        throw new ForbiddenError('Just-In-Time provisioning is disabled for this organization');
      }

      user = await this.repo.createUser({
        email: profile.email,
        firstName: profile.firstName || null,
        lastName: profile.lastName || null,
        status: 'active',
        emailVerifiedAt: new Date(),
      });
    }

    // 2. Link external identity in user_identities if not already linked
    const existingIdentity = await this.repo.findUserIdentity(providerId, profile.externalSubjectId);
    if (!existingIdentity) {
      await this.repo.createUserIdentity({
        organizationId,
        userId: user.id,
        identityProviderId: providerId,
        externalSubjectId: profile.externalSubjectId,
        profileData: profile.rawClaims,
      });
    }

    // 3. Ensure organization membership
    const [existingMember] = await db
      .select()
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.organizationId, organizationId),
          eq(organizationMembers.userId, user.id)
        )
      );

    if (!existingMember) {
      if (!jitEnabled) {
        throw new ForbiddenError('User is not a member of this organization');
      }

      // Provision membership
      const [newMember] = await db
        .insert(organizationMembers)
        .values({
          organizationId,
          userId: user.id,
          status: 'active',
        })
        .returning();

      // Assign default role (or fallback to 'member' role in that organization)
      let targetRoleId = defaultRoleId;
      if (!targetRoleId) {
        const [memberRole] = await db
          .select()
          .from(roles)
          .where(and(eq(roles.organizationId, organizationId), eq(roles.name, 'member')));
        targetRoleId = memberRole?.id;
      }

      if (targetRoleId && newMember) {
        await db.insert(memberRoles).values({
          organizationId,
          memberId: newMember.id,
          roleId: targetRoleId,
        });
      }
    }

    return user;
  }
}

export const authService = new AuthService();
