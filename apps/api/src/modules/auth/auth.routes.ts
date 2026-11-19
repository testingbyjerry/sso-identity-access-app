import {
  ForgotPasswordInput,
  LoginInput,
  ResetPasswordInput,
  SsoCallbackQuery,
  SsoStartInput,
  SwitchOrganizationInput,
} from '@sso/validation';
import { FastifyInstance } from 'fastify';
import { serverConfig } from '../../config/index.js';
import { requireAuth } from '../../common/auth-guard.js';
import { authController } from './auth.controller.js';
import {
  csrfTokenSwaggerSchema,
  forgotPasswordSwaggerSchema,
  loginSwaggerSchema,
  logoutSwaggerSchema,
  meSwaggerSchema,
  resetPasswordSwaggerSchema,
  ssoCallbackSwaggerSchema,
  ssoDiscoverSwaggerSchema,
  ssoStartSwaggerSchema,
  switchOrganizationSwaggerSchema,
} from './auth.schema.js';

export async function authRoutes(app: FastifyInstance): Promise<void> {
  // Strict rate limit config for authentication brute-force protection
  const authRateLimitConfig = {
    rateLimit: {
      max: serverConfig.isTest ? 5000 : 5,
      timeWindow: '1 minute',
    },
  };

  // Public authentication endpoints with brute force protection
  app.post<{ Body: LoginInput }>(
    '/auth/login',
    { schema: loginSwaggerSchema, config: authRateLimitConfig },
    (req, rep) => authController.login(req, rep)
  );
  app.post<{ Body: ForgotPasswordInput }>(
    '/auth/forgot-password',
    { schema: forgotPasswordSwaggerSchema, config: authRateLimitConfig },
    (req, rep) => authController.forgotPassword(req, rep)
  );
  app.post<{ Body: ResetPasswordInput }>(
    '/auth/reset-password',
    { schema: resetPasswordSwaggerSchema, config: authRateLimitConfig },
    (req, rep) => authController.resetPassword(req, rep)
  );

  // CSRF token retrieval
  app.get('/auth/csrf', { schema: csrfTokenSwaggerSchema }, (req, rep) =>
    authController.getCsrfToken(req, rep)
  );

  // Authenticated user & session endpoints
  app.get('/auth/me', { preHandler: [requireAuth], schema: meSwaggerSchema }, (req, rep) =>
    authController.me(req, rep)
  );
  app.post('/auth/logout', { preHandler: [requireAuth], schema: logoutSwaggerSchema }, (req, rep) =>
    authController.logout(req, rep)
  );
  app.post<{ Body: SwitchOrganizationInput }>(
    '/auth/switch-organization',
    { preHandler: [requireAuth], schema: switchOrganizationSwaggerSchema },
    (req, rep) => authController.switchOrganization(req, rep)
  );

  // Enterprise SSO endpoints
  app.get<{ Querystring: { query: string } }>(
    '/auth/sso/discover',
    { schema: ssoDiscoverSwaggerSchema },
    (req, rep) => authController.ssoDiscover(req, rep)
  );
  app.post<{ Body: SsoStartInput }>('/auth/sso/start', { schema: ssoStartSwaggerSchema }, (req, rep) =>
    authController.ssoStart(req, rep)
  );
  app.get<{ Querystring: SsoCallbackQuery }>(
    '/auth/sso/callback',
    { schema: ssoCallbackSwaggerSchema },
    (req, rep) => authController.ssoCallback(req, rep)
  );
}
