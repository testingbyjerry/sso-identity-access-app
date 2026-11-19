import type {
  HttpStatusCode,
  IdentityProviderType,
  InvitationStatus,
  MemberStatus,
  OrganizationStatus,
  UserStatus,
} from './constants.js';
import type { ErrorDetail } from './errors.js';

export type TenantId = string;
export type OrganizationId = string;
export type UserId = string;
export type RoleId = string;
export type PermissionId = string;
export type MemberId = string;

/**
 * Verified runtime tenant execution context.
 * Must never be instantiated directly from unauthenticated or unverified client data.
 */
export interface TenantContext {
  organizationId: string;
  userId: string;
  memberId?: string;
  roles?: string[];
  permissions?: string[];
  isSuperAdmin?: boolean;
}

export interface ApiResponse<T> {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    message: string;
    code: string;
    statusCode: HttpStatusCode | number;
    details?: ErrorDetail[];
    requestId?: string;
  };
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface PaginatedResponse<T> {
  success: true;
  data: T[];
  pagination: PaginationMeta;
}

export interface SystemHealth {
  status: 'ok' | 'degraded' | 'error';
  timestamp: string;
  uptime: number;
  environment: string;
  version: string;
}

export interface DatabaseHealthInfo {
  status: 'connected' | 'disconnected';
  latencyMs?: number;
  error?: string;
}

export interface ReadinessCheck {
  status: 'ready' | 'not_ready';
  timestamp: string;
  uptime: number;
  checks: {
    database: DatabaseHealthInfo;
  };
}

export interface OrganizationDTO {
  id: string;
  name: string;
  slug: string;
  domain?: string | null;
  status: OrganizationStatus;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface UserDTO {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  isSuperAdmin: boolean;
  status: UserStatus;
  emailVerifiedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MemberRoleSummary {
  id: string;
  name: string;
}

export interface MemberDTO {
  id: string;
  organizationId: string;
  userId: string;
  status: MemberStatus;
  joinedAt: string;
  createdAt: string;
  updatedAt: string;
  user?: UserDTO;
  roles?: MemberRoleSummary[];
}

export interface RoleDTO {
  id: string;
  organizationId: string;
  name: string;
  description?: string | null;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
  permissions?: string[];
}

export interface IdentityProviderDTO {
  id: string;
  organizationId: string;
  type: IdentityProviderType;
  name: string;
  slug: string;
  enabled: boolean;
  domains?: string[];
  config?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLogDTO {
  id: string;
  organizationId: string;
  actorUserId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface InvitationDTO {
  id: string;
  organizationId: string;
  email: string;
  roleId: string;
  invitedByUserId: string;
  status: InvitationStatus;
  expiresAt: string;
  createdAt: string;
}

export interface SessionDTO {
  id: string;
  userId: string;
  activeOrganizationId?: string | null;
  userAgent?: string | null;
  ipAddress?: string | null;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserOrganizationMembershipSummary {
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  roles: string[];
  permissions: string[];
}

export interface CurrentUserDTO extends UserDTO {
  organizations: UserOrganizationMembershipSummary[];
  activeOrganizationId?: string | null;
}

export interface SsoInitiateResult {
  authorizationUrl: string;
  state: string;
}
