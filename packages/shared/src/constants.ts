export const HttpStatus = {
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

export type HttpStatusCode = (typeof HttpStatus)[keyof typeof HttpStatus];

export const ErrorCode = {
  BAD_REQUEST: 'BAD_REQUEST',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  DATABASE_ERROR: 'DATABASE_ERROR',
  ROUTE_NOT_FOUND: 'ROUTE_NOT_FOUND',
  TENANT_REQUIRED: 'TENANT_REQUIRED',
  CROSS_TENANT_VIOLATION: 'CROSS_TENANT_VIOLATION',
  INVALID_TENANT: 'INVALID_TENANT',
} as const;

export type ErrorCodeType = (typeof ErrorCode)[keyof typeof ErrorCode];

export const OrganizationStatus = {
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
  PENDING: 'pending',
} as const;

export type OrganizationStatus = (typeof OrganizationStatus)[keyof typeof OrganizationStatus];

export const UserStatus = {
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
  PENDING_VERIFICATION: 'pending_verification',
} as const;

export type UserStatus = (typeof UserStatus)[keyof typeof UserStatus];

export const MemberStatus = {
  ACTIVE: 'active',
  INVITED: 'invited',
  SUSPENDED: 'suspended',
} as const;

export type MemberStatus = (typeof MemberStatus)[keyof typeof MemberStatus];

export const InvitationStatus = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  REVOKED: 'revoked',
  EXPIRED: 'expired',
} as const;

export type InvitationStatus = (typeof InvitationStatus)[keyof typeof InvitationStatus];

export const IdentityProviderType = {
  SAML: 'saml',
  OIDC: 'oidc',
  GOOGLE: 'google',
  MICROSOFT: 'microsoft',
  GITHUB: 'github',
} as const;

export type IdentityProviderType = (typeof IdentityProviderType)[keyof typeof IdentityProviderType];

export const SsoTransactionStatus = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  FAILED: 'failed',
  EXPIRED: 'expired',
} as const;

export type SsoTransactionStatus = (typeof SsoTransactionStatus)[keyof typeof SsoTransactionStatus];

export const SystemRole = {
  OWNER: 'owner',
  ADMIN: 'admin',
  MEMBER: 'member',
  VIEWER: 'viewer',
} as const;

export type SystemRole = (typeof SystemRole)[keyof typeof SystemRole];

// Backwards compatibility alias
export const UserRole = SystemRole;
export type UserRole = SystemRole;

export const Permissions = {
  // Organization management
  ORG_READ: 'org:read',
  ORG_UPDATE: 'org:update',
  ORG_DELETE: 'org:delete',

  // Member management
  MEMBER_READ: 'member:read',
  MEMBER_INVITE: 'member:invite',
  MEMBER_UPDATE: 'member:update',
  MEMBER_REMOVE: 'member:remove',

  // Role and permission management
  ROLE_READ: 'role:read',
  ROLE_CREATE: 'role:create',
  ROLE_UPDATE: 'role:update',
  ROLE_DELETE: 'role:delete',

  // Identity Provider (SSO) management
  IDP_READ: 'idp:read',
  IDP_CREATE: 'idp:create',
  IDP_UPDATE: 'idp:update',
  IDP_DELETE: 'idp:delete',

  // Audit Logs
  AUDIT_READ: 'audit:read',
} as const;

export type PermissionKey = (typeof Permissions)[keyof typeof Permissions];
