import helmet, { FastifyHelmetOptions } from '@fastify/helmet';
import { FastifyInstance } from 'fastify';
import { serverConfig } from '../config/index.js';

export async function registerHelmet(app: FastifyInstance): Promise<void> {
  const helmetOptions: FastifyHelmetOptions = {
    // In development, relax CSP to allow Swagger UI and local development
    contentSecurityPolicy: serverConfig.isDevelopment
      ? false
      : {
          directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", 'data:', 'validator.swagger.io'],
          },
        },
  };

  await app.register(helmet, helmetOptions);
}
