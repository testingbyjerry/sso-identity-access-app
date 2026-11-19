export const loginSwaggerSchema = {
  description: 'Log in using email and password, establishing an authenticated session cookie',
  tags: ['Authentication'],
  body: {
    type: 'object',
    required: ['email', 'password'],
    properties: {
      email: { type: 'string', format: 'email' },
      password: { type: 'string', minLength: 8 },
      organizationId: { type: 'string', format: 'uuid' },
    },
  },
};

export const logoutSwaggerSchema = {
  description: 'Log out and invalidate current session',
  tags: ['Authentication'],
};

export const meSwaggerSchema = {
  description: 'Get current authenticated user profile, active organization, and tenant memberships',
  tags: ['Authentication'],
};

export const forgotPasswordSwaggerSchema = {
  description: 'Request password reset email. Always returns generic success message.',
  tags: ['Authentication'],
  body: {
    type: 'object',
    required: ['email'],
    properties: {
      email: { type: 'string', format: 'email' },
    },
  },
};

export const resetPasswordSwaggerSchema = {
  description: 'Reset password using single-use cryptographically verified token',
  tags: ['Authentication'],
  body: {
    type: 'object',
    required: ['token', 'newPassword'],
    properties: {
      token: { type: 'string' },
      newPassword: { type: 'string', minLength: 8 },
    },
  },
};

export const switchOrganizationSwaggerSchema = {
  description: 'Switch active organization for current session after membership verification',
  tags: ['Authentication'],
  body: {
    type: 'object',
    required: ['organizationId'],
    properties: {
      organizationId: { type: 'string', format: 'uuid' },
    },
  },
};

export const ssoDiscoverSwaggerSchema = {
  description: 'Discover enabled enterprise identity provider for an organization by domain or slug',
  tags: ['Authentication', 'SSO'],
  querystring: {
    type: 'object',
    required: ['query'],
    properties: {
      query: { type: 'string' },
    },
  },
};

export const ssoStartSwaggerSchema = {
  description: 'Initiate enterprise SSO login flow with PKCE S256 challenge',
  tags: ['Authentication', 'SSO'],
  body: {
    type: 'object',
    required: ['providerId'],
    properties: {
      providerId: { type: 'string', format: 'uuid' },
      redirectUri: { type: 'string' },
    },
  },
};

export const ssoCallbackSwaggerSchema = {
  description: 'Process OIDC authorization code callback with state/nonce and token verification',
  tags: ['Authentication', 'SSO'],
  querystring: {
    type: 'object',
    required: ['code', 'state'],
    properties: {
      code: { type: 'string' },
      state: { type: 'string' },
    },
  },
};

export const csrfTokenSwaggerSchema = {
  description: 'Generate and retrieve anti-CSRF token',
  tags: ['Authentication'],
};
