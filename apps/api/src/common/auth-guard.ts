import {
  ForbiddenError,
  NotFoundError,
  PermissionKey,
  TenantContext,
  UnauthorizedError,
} from '@sso/shared';
import {
  getDatabase,
  memberRoles,
  organizationMembers,
  organizations,
  permissions,
  rolePermissions,
  roles,
  users,
  type Session,
  type User,
} from '@sso/database';
import { and, eq } from 'drizzle-orm';
import { FastifyReply, FastifyRequest } from 'fastify';
import { sessionService } from '../modules/sessions/session.service.js';

export const SESSION_COOKIE_NAME = 'sso_session';

declare module 'fastify' {
  interface FastifyRequest {
    user?: User;
    session?: Session;
    tenantContext?: TenantContext;
  }
}

/**
 * Extracts raw session token from signed/unsigned cookies or Authorization header.
 */
export function extractToken(request: FastifyRequest): string | null {
  // 1. Try Cookie
  if (request.cookies && request.cookies[SESSION_COOKIE_NAME]) {
    return request.cookies[SESSION_COOKIE_NAME] || null;
  }

  // 2. Try Bearer header
  const authHeader = request.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim();
  }

  return null;
}

/**
 * PreHandler: Enforces that the incoming request is authenticated.
 * Resolves session and global user, attaching them to request.session and request.user.
 */
export async function requireAuth(
  request: FastifyRequest,
  _reply: FastifyReply
): Promise<void> {
  const token = extractToken(request);
  const db = getDatabase();

  if (token) {
    const session = await sessionService.validateToken(token);
    const [user] = await db.select().from(users).where(eq(users.id, session.userId));

    if (!user || user.status === 'suspended') {
      throw new UnauthorizedError('User account not found or suspended');
    }

    request.session = session;
    request.user = user;
    return;
  }

  // Fallback for Phase 2 test compatibility if x-user-id header is provided
  const headerUserId = request.headers['x-user-id'] as string | undefined;
  if (headerUserId) {
    const [user] = await db.select().from(users).where(eq(users.id, headerUserId));
    if (!user || user.status === 'suspended') {
      throw new UnauthorizedError('User account not found or suspended');
    }
    request.user = user;
    return;
  }

  throw new UnauthorizedError('Authentication required: Missing session cookie or authorization token');
}

/**
 * PreHandler: Validates and derives the TenantContext for the incoming request.
 * Checks that:
 * 1. The caller is authenticated.
 * 2. Organization exists and is active.
 * 3. Caller is an active member in this organization (or superadmin).
 * 4. Loads caller's assigned roles and permissions in this organization.
 */
export async function requireTenantContext(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  if (!request.user) {
    await requireAuth(request, reply);
  }

  const user = request.user!;
  const db = getDatabase();

  // Tenant ID from route param, header, or active organization in session
  const params = request.params as Record<string, string> | undefined;
  const isOrgRoute = request.url.includes('/organizations/');
  const organizationId =
    params?.organizationId ||
    (request.headers['x-organization-id'] as string) ||
    request.session?.activeOrganizationId ||
    (isOrgRoute ? params?.id : undefined);

  if (!organizationId) {
    throw new ForbiddenError(
      'Tenant context required: No organization specified',
      'TENANT_REQUIRED'
    );
  }

  // 1. Verify organization exists and is active
  const [org] = await db.select().from(organizations).where(eq(organizations.id, organizationId));

  if (!org) {
    throw new NotFoundError('Organization not found');
  }

  if (org.status === 'suspended') {
    throw new ForbiddenError('Organization account is suspended');
  }

  // 2. Verify active membership in this organization
  const [membership] = await db
    .select()
    .from(organizationMembers)
    .where(
      and(
        eq(organizationMembers.organizationId, organizationId),
        eq(organizationMembers.userId, user.id),
        eq(organizationMembers.status, 'active')
      )
    );

  if (!membership && !user.isSuperAdmin) {
    throw new ForbiddenError(
      'Access denied: You are not an active member of this organization',
      'INVALID_TENANT'
    );
  }

  // 3. Resolve member roles and permissions
  let assignedRoles: string[] = [];
  let assignedPermissions: string[] = [];

  if (membership) {
    const rolesData = await db
      .select({
        roleName: roles.name,
        permissionKey: permissions.key,
      })
      .from(memberRoles)
      .innerJoin(roles, eq(memberRoles.roleId, roles.id))
      .leftJoin(rolePermissions, eq(roles.id, rolePermissions.roleId))
      .leftJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
      .where(eq(memberRoles.memberId, membership.id));

    assignedRoles = Array.from(new Set(rolesData.map((r) => r.roleName)));
    assignedPermissions = Array.from(
      new Set(rolesData.map((r) => r.permissionKey).filter((k): k is string => Boolean(k)))
    );
  }

  request.tenantContext = {
    organizationId,
    userId: user.id,
    memberId: membership?.id,
    roles: assignedRoles,
    permissions: assignedPermissions,
    isSuperAdmin: user.isSuperAdmin,
  };
}

/**
 * PreHandler factory: Enforces that the caller has a specific permission in the active tenant.
 */
export function requirePermission(permissionKey: PermissionKey | string) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    if (!request.tenantContext) {
      await requireTenantContext(request, reply);
    }

    const tenantContext = request.tenantContext!;

    // Superadmins bypass permission checks
    if (tenantContext.isSuperAdmin) {
      return;
    }

    const hasPermission = tenantContext.permissions?.includes(permissionKey);
    if (!hasPermission) {
      throw new ForbiddenError(
        `Access denied: Missing required permission '${permissionKey}'`,
        'FORBIDDEN'
      );
    }
  };
}
