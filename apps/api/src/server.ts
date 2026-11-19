import { closeDatabase } from '@sso/database';
import { buildApp } from './app.js';
import { serverConfig } from './config/index.js';

async function startServer(): Promise<void> {
  const app = await buildApp();

  const shutdown = async (signal: string) => {
    app.log.info(`Received ${signal}. Gracefully shutting down...`);
    try {
      await app.close();
      await closeDatabase();
      app.log.info('Server and database connections successfully closed.');
      process.exit(0);
    } catch (err) {
      app.log.error({ err }, 'Error during graceful shutdown');
      process.exit(1);
    }
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  try {
    const address = await app.listen({
      port: serverConfig.port,
      host: serverConfig.host,
    });
    app.log.info(`API Server running at ${address}`);
    app.log.info(`Swagger Documentation available at ${address}/docs`);
    app.log.info(`Liveness probe: ${address}/api/v1/health`);
    app.log.info(`Readiness probe: ${address}/api/v1/ready`);
  } catch (error) {
    app.log.fatal({ error }, 'Failed to start API server');
    process.exit(1);
  }
}

startServer();
