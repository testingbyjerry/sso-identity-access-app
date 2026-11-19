import {
  ForbiddenError,
  NotFoundError,
  SessionDTO,
  UnauthorizedError,
} from '@sso/shared';
import {
  getDatabase,
  organizationMembers,
  organizations,
  users,
  type Session,
} from '@sso/database';
import { and, eq } from 'drizzle-orm';
import { generateOpaqueToken, hashToken } from '../../common/crypto.js';
import { sessionRepository, SessionRepository } from './session.repository.js';

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface CreateSessionResult {
  session: Session;
  rawToken: string;
}

export class SessionService {
  constructor(private readonly repo: SessionRepository = sessionRepository) {}

  /**
   * Create a new authenticated session with a cryptographically secure opaque token.
   * Only the SHA-256 token hash is persisted in PostgreSQL.
   */
  async createSession(
    userId: string,
    activeOrganizationId?: string | null,
    userAgent?: string,
    ipAddress?: string
  ): Promise<CreateSessionResult> {
    const rawToken = generateOpaqueToken(32);
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

    const session = await this.repo.create({
      userId,
      activeOrganizationId: activeOrganizationId || null,
      tokenHash,
      userAgent: userAgent || null,
      ipAddress: ipAddress || null,
      expiresAt,
    });

    return { session, rawToken };
  }

  /**
   * Validate a raw opaque session token against the database hash.
   */
  async validateToken(rawToken: string): Promise<Session> {
    if (!rawToken || typeof rawToken !== 'string') {
      throw new UnauthorizedError('Missing or invalid session token');
    }

    const tokenHash = hashToken(rawToken);
    const session = await this.repo.findByTokenHash(tokenHash);

    if (!session) {
      throw new UnauthorizedError('Session is invalid or expired');
    }

    return session;
  }

  /**
   * Rotate a session token upon authentication, privilege elevation, or org switch.
   */
  async rotateSession(
    sessionId: string,
    userAgent?: string,
    ipAddress?: string
  ): Promise<CreateSessionResult> {
    const currentSession = await this.repo.findById(sessionId);
    if (!currentSession) {
      throw new UnauthorizedError('Session not found for rotation');
    }

    const rawToken = generateOpaqueToken(32);
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

    const updated = await this.repo.update(sessionId, {
      tokenHash,
      userAgent: userAgent ?? currentSession.userAgent,
      ipAddress: ipAddress ?? currentSession.ipAddress,
      expiresAt,
    });

    if (!updated) {
      throw new UnauthorizedError('Failed to rotate session');
    }

    return { session: updated, rawToken };
  }

  /**
   * Switch the active organization for the current session.
   * Strictly validates user's active membership in the target organization before switching.
   * Rotates the session token to prevent session fixation.
   */
  async switchOrganization(
    sessionId: string,
    userId: string,
    targetOrganizationId: string
  ): Promise<CreateSessionResult> {
    const db = getDatabase();

    // 1. Verify organization exists and is active
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, targetOrganizationId));

    if (!org) {
      throw new NotFoundError('Target organization not found');
    }

    if (org.status === 'suspended') {
      throw new ForbiddenError('Target organization is suspended');
    }

    // 2. Verify user status
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user || user.status === 'suspended') {
      throw new ForbiddenError('User account not found or suspended');
    }

    // 3. Verify active membership in target organization (superadmin exempt)
    if (!user.isSuperAdmin) {
      const [membership] = await db
        .select()
        .from(organizationMembers)
        .where(
          and(
            eq(organizationMembers.organizationId, targetOrganizationId),
            eq(organizationMembers.userId, userId),
            eq(organizationMembers.status, 'active')
          )
        );

      if (!membership) {
        throw new ForbiddenError(
          'Access denied: You are not an active member of the target organization',
          'INVALID_TENANT'
        );
      }
    }

    // 4. Rotate session token and update active organization ID
    const rawToken = generateOpaqueToken(32);
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

    const updated = await this.repo.update(sessionId, {
      activeOrganizationId: targetOrganizationId,
      tokenHash,
      expiresAt,
    });

    if (!updated) {
      throw new NotFoundError('Session not found to switch organization');
    }

    return { session: updated, rawToken };
  }

  /**
   * Terminate a specific session.
   */
  async revokeSession(sessionId: string, userId: string): Promise<void> {
    const session = await this.repo.findById(sessionId);
    if (!session) {
      throw new NotFoundError('Session not found');
    }

    if (session.userId !== userId) {
      throw new ForbiddenError('Cannot revoke session belonging to another user');
    }

    await this.repo.delete(sessionId);
  }

  /**
   * Terminate all sessions for a user, optionally preserving the current one.
   */
  async revokeAllUserSessions(userId: string, exceptSessionId?: string): Promise<number> {
    return this.repo.deleteAllForUser(userId, exceptSessionId);
  }

  /**
   * List active sessions for a user.
   */
  async getUserSessions(userId: string): Promise<SessionDTO[]> {
    const sessionsList = await this.repo.findByUserId(userId);
    return sessionsList.map((s) => ({
      id: s.id,
      userId: s.userId,
      activeOrganizationId: s.activeOrganizationId,
      userAgent: s.userAgent,
      ipAddress: s.ipAddress,
      expiresAt: s.expiresAt.toISOString(),
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    }));
  }
}

export const sessionService = new SessionService();
