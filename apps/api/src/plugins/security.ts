import fastifyCookie from '@fastify/cookie';
import fastifyCsrf from '@fastify/csrf-protection';
import fastifyRateLimit from '@fastify/rate-limit';
import { FastifyInstance } from 'fastify';
import { serverConfig } from '../config/index.js';

export async function registerSecurityPlugins(app: FastifyInstance): Promise<void> {
  // 1. Cookie support with session signing
  await app.register(fastifyCookie, {
    secret: serverConfig.sessionSecret,
  });

  // 2. Rate limiting protection against brute force
  await app.register(fastifyRateLimit, {
    global: true, // Enabled globally with safe defaults for API requests
    max: serverConfig.isTest ? 10000 : 120,
    timeWindow: '1 minute',
  });

  // 3. CSRF Protection for state-changing requests
  await app.register(fastifyCsrf, {
    cookieKey: '_csrf',
    cookieOpts: {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: serverConfig.isProduction,
    },
  });
}
