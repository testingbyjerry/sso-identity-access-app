import { z } from 'zod';

export const uuidSchema = z.string().uuid({ message: 'Must be a valid UUID' });

export const idParamSchema = z.object({
  id: uuidSchema,
});

export const organizationIdParamSchema = z.object({
  organizationId: uuidSchema,
});

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).default('asc'),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export const healthResponseSchema = z.object({
  status: z.enum(['ok', 'degraded', 'error']),
  timestamp: z.string().datetime(),
  uptime: z.number().nonnegative(),
  environment: z.string(),
  version: z.string(),
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;

export const databaseHealthInfoSchema = z.object({
  status: z.enum(['connected', 'disconnected']),
  latencyMs: z.number().optional(),
  error: z.string().optional(),
});

export const readinessResponseSchema = z.object({
  status: z.enum(['ready', 'not_ready']),
  timestamp: z.string().datetime(),
  uptime: z.number().nonnegative(),
  checks: z.object({
    database: databaseHealthInfoSchema,
  }),
});

export type ReadinessResponse = z.infer<typeof readinessResponseSchema>;

export const errorDetailSchema = z.object({
  field: z.string().optional(),
  message: z.string(),
  code: z.string().optional(),
});

export const apiErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.object({
    message: z.string(),
    code: z.string(),
    statusCode: z.number(),
    details: z.array(errorDetailSchema).optional(),
    requestId: z.string().optional(),
  }),
});

export type ApiErrorResponseOutput = z.infer<typeof apiErrorResponseSchema>;

// ==========================================
// Organization Schemas
// ==========================================

export const createOrganizationSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  slug: z
    .string()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  domain: z.string().max(255).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;

export const updateOrganizationSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  domain: z.string().max(255).optional(),
  status: z.enum(['active', 'suspended', 'pending']).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>;

// Backwards compatibility alias
export const tenantBaseSchema = createOrganizationSchema;
export type TenantBaseInput = CreateOrganizationInput;

// ==========================================
// User & Member Schemas
// ==========================================

export const userBaseSchema = z.object({
  email: z.string().email('Must be a valid email address'),
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
});

export type UserBaseInput = z.infer<typeof userBaseSchema>;

export const inviteMemberSchema = z.object({
  email: z.string().email(),
  roleId: uuidSchema,
});

export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;

export const updateMemberSchema = z.object({
  status: z.enum(['active', 'invited', 'suspended']).optional(),
  roleIds: z.array(uuidSchema).optional(),
});

export type UpdateMemberInput = z.infer<typeof updateMemberSchema>;

// ==========================================
// Role Schemas
// ==========================================

export const createRoleSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
  permissionKeys: z.array(z.string()).default([]),
});

export type CreateRoleInput = z.infer<typeof createRoleSchema>;

export const updateRoleSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  description: z.string().max(500).optional(),
  permissionKeys: z.array(z.string()).optional(),
});

export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;

// ==========================================
// Identity Provider (IdP) Schemas
// ==========================================

export const createIdentityProviderSchema = z.object({
  type: z.enum(['saml', 'oidc', 'google', 'microsoft', 'github']),
  name: z.string().min(2).max(100),
  slug: z
    .string()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  enabled: z.boolean().default(true),
  domains: z.array(z.string()).default([]),
  config: z.record(z.unknown()).default({}),
  metadata: z.record(z.unknown()).optional(),
});

export type CreateIdentityProviderInput = z.infer<typeof createIdentityProviderSchema>;

export const updateIdentityProviderSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  enabled: z.boolean().optional(),
  domains: z.array(z.string()).optional(),
  config: z.record(z.unknown()).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type UpdateIdentityProviderInput = z.infer<typeof updateIdentityProviderSchema>;

// ==========================================
// Audit Log Query Schemas
// ==========================================

export const auditLogQuerySchema = paginationQuerySchema.extend({
  action: z.string().optional(),
  entityType: z.string().optional(),
  actorUserId: uuidSchema.optional(),
});

export type AuditLogQuery = z.infer<typeof auditLogQuerySchema>;

// ==========================================
// Authentication & SSO Schemas
// ==========================================

export const loginSchema = z.object({
  email: z.string().email('Must be a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  organizationId: uuidSchema.optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().email('Must be a valid email address'),
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const switchOrganizationSchema = z.object({
  organizationId: uuidSchema,
});

export type SwitchOrganizationInput = z.infer<typeof switchOrganizationSchema>;

export const ssoDiscoverSchema = z.object({
  query: z.string().min(1, 'Discovery query cannot be empty'),
});

export type SsoDiscoverInput = z.infer<typeof ssoDiscoverSchema>;

export const ssoStartSchema = z.object({
  providerId: uuidSchema,
  redirectUri: z.string().url().optional(),
});

export type SsoStartInput = z.infer<typeof ssoStartSchema>;

export const ssoCallbackQuerySchema = z.object({
  code: z.string().min(1, 'Authorization code is required'),
  state: z.string().min(1, 'State parameter is required'),
});

export type SsoCallbackQuery = z.infer<typeof ssoCallbackQuerySchema>;

export const oidcConfigSchema = z.object({
  issuer: z.string().url(),
  clientId: z.string().min(1),
  clientSecret: z.string().min(1),
  scopes: z.array(z.string()).default(['openid', 'profile', 'email']),
  redirectUri: z.string().url().optional(),
  tenantId: z.string().optional(),
  jitEnabled: z.boolean().default(true),
  defaultRoleId: uuidSchema.optional(),
});

export type OidcConfig = z.infer<typeof oidcConfigSchema>;
