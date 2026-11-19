import { randomUUID } from 'node:crypto';
import fastify, { FastifyInstance, FastifyServerOptions } from 'fastify';
import { serverConfig } from './config/index.js';
import { auditLogRoutes } from './modules/audit-logs/audit-log.routes.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { healthRoutes } from './modules/health/health.routes.js';
import { identityProviderRoutes } from './modules/identity-providers/identity-provider.routes.js';
import { memberRoutes } from './modules/members/member.routes.js';
import { organizationRoutes } from './modules/organizations/organization.routes.js';
import { roleRoutes } from './modules/roles/role.routes.js';
import { sessionRoutes } from './modules/sessions/session.routes.js';
import { registerCors } from './plugins/cors.js';
import { registerErrorHandler } from './plugins/error-handler.js';
import { registerHelmet } from './plugins/helmet.js';
import { registerSecurityPlugins } from './plugins/security.js';
import { registerSwagger } from './plugins/swagger.js';

export interface AppOptions {
  logger?: FastifyServerOptions['logger'];
}

export async function buildApp(options: AppOptions = {}): Promise<FastifyInstance> {
  const isTest = serverConfig.isTest;
  const isDev = serverConfig.isDevelopment;

  const defaultLogger: FastifyServerOptions['logger'] = isTest
    ? false
    : {
        level: serverConfig.logLevel,
        redact: {
          paths: [
            'req.headers.authorization',
            'req.headers.cookie',
            'req.headers["set-cookie"]',
            'password',
            '*.password',
            'clientSecret',
            '*.clientSecret',
            'token',
            '*.token',
            'newPassword',
            '*.newPassword',
            'codeVerifier',
            '*.codeVerifier',
          ],
          censor: '[REDACTED]',
        },
        transport: isDev
          ? {
              target: 'pino-pretty',
              options: {
                colorize: true,
                translateTime: 'HH:MM:ss Z',
                ignore: 'pid,hostname',
              },
            }
          : undefined,
      };

  const app = fastify({
    logger: options.logger ?? defaultLogger,
    genReqId: (req) => {
      const headerReqId = req.headers['x-request-id'];
      if (typeof headerReqId === 'string' && headerReqId.length > 0) {
        return headerReqId;
      }
      return randomUUID();
    },
    requestIdHeader: 'x-request-id',
  });

  // Inject Request ID header into every outgoing response
  app.addHook('onSend', async (request, reply) => {
    reply.header('x-request-id', request.id);
  });

  // Security & Core Plugins
  await registerCors(app);
  await registerHelmet(app);
  await registerSecurityPlugins(app);
  await registerSwagger(app);
  registerErrorHandler(app);

  // Register API modules under /api/v1
  await app.register(healthRoutes, { prefix: '/api/v1' });
  await app.register(authRoutes, { prefix: '/api/v1' });
  await app.register(sessionRoutes, { prefix: '/api/v1' });
  await app.register(organizationRoutes, { prefix: '/api/v1' });
  await app.register(memberRoutes, { prefix: '/api/v1' });
  await app.register(roleRoutes, { prefix: '/api/v1' });
  await app.register(identityProviderRoutes, { prefix: '/api/v1' });
  await app.register(auditLogRoutes, { prefix: '/api/v1' });

  // Root summary endpoint
  app.get('/', async (_req, reply) => {
    return reply.send({
      name: 'SSO & IAM Platform API',
      version: '1.0.0',
      docs: '/docs',
      health: '/api/v1/health',
      ready: '/api/v1/ready',
    });
  });

  return app;
}
