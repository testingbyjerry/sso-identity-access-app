import { checkDatabaseHealth } from '@sso/database';
import { FastifyInstance } from 'fastify';
import { serverConfig } from '../../config/index.js';
import { healthSchema, readySchema } from './health.schema.js';

export async function healthRoutes(app: FastifyInstance): Promise<void> {
  // Liveness check: verifies process is alive and responding
  app.get('/health', { schema: healthSchema }, async (_request, reply) => {
    return reply.status(200).send({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: serverConfig.nodeEnv,
      version: '1.0.0',
    });
  });

  // Readiness check: verifies backing infrastructure (PostgreSQL database)
  app.get('/ready', { schema: readySchema }, async (_request, reply) => {
    const dbHealth = await checkDatabaseHealth();
    const isReady = dbHealth.status === 'connected';

    const statusCode = isReady ? 200 : 503;

    return reply.status(statusCode).send({
      status: isReady ? 'ready' : 'not_ready',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      checks: {
        database: dbHealth,
      },
    });
  });
}
