import cors, { FastifyCorsOptions } from '@fastify/cors';
import { FastifyInstance } from 'fastify';
import { serverConfig } from '../config/index.js';

export async function registerCors(app: FastifyInstance): Promise<void> {
  const corsOptions: FastifyCorsOptions = {
    origin: (origin, cb) => {
      // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
      if (!origin) {
        cb(null, true);
        return;
      }

      const allowedOrigins = serverConfig.corsOrigin.split(',').map((o) => o.trim());

      if (
        serverConfig.isDevelopment ||
        allowedOrigins.includes('*') ||
        allowedOrigins.includes(origin)
      ) {
        cb(null, true);
        return;
      }

      cb(new Error(`Origin ${origin} not allowed by CORS policy`), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Request-Id', 'x-csrf-token'],
    exposedHeaders: ['X-Request-Id'],
  };

  await app.register(cors, corsOptions);
}
