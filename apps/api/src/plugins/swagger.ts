import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { FastifyInstance } from 'fastify';

export async function registerSwagger(app: FastifyInstance): Promise<void> {
  await app.register(swagger, {
    openapi: {
      openapi: '3.1.0',
      info: {
        title: 'SSO & IAM Platform API',
        description:
          'Multi-tenant Single Sign-On and Identity Access Management REST API documentation.',
        version: '1.0.0',
        contact: {
          name: 'Architecture Team',
        },
      },
      servers: [
        {
          url: '/api/v1',
          description: 'API v1 Base URL',
        },
      ],
      tags: [
        { name: 'System', description: 'System health, liveness and readiness probes' },
        { name: 'Tenants', description: 'Multi-tenant organization management (Phase 2)' },
        { name: 'SSO', description: 'Identity providers and SSO protocols (Phase 2)' },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
    },
  });

  await app.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
      displayRequestDuration: true,
    },
    staticCSP: false,
    transformStaticCSP: (header) => header,
  });
}
