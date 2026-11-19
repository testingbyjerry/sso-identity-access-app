import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';

describe('API Foundation & Health Checks', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp({ logger: false });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /api/v1/health (Liveness)', () => {
    it('should return 200 OK with system status', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/health',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body).toHaveProperty('status', 'ok');
      expect(body).toHaveProperty('timestamp');
      expect(body).toHaveProperty('uptime');
      expect(body).toHaveProperty('environment');
      expect(body).toHaveProperty('version');
    });

    it('should attach and propagate x-request-id header', async () => {
      const customReqId = 'custom-request-id-12345';
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/health',
        headers: {
          'x-request-id': customReqId,
        },
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['x-request-id']).toBe(customReqId);
    });
  });

  describe('GET /api/v1/ready (Readiness)', () => {
    it('should return response containing database health check status', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/ready',
      });

      // Status code is 200 (if DB running) or 503 (if DB offline in test environment)
      expect([200, 503]).toContain(response.statusCode);
      const body = JSON.parse(response.payload);
      expect(body).toHaveProperty('status');
      expect(body).toHaveProperty('checks');
      expect(body.checks).toHaveProperty('database');
      expect(['connected', 'disconnected']).toContain(body.checks.database.status);
    });
  });

  describe('GET /non-existent-route (Global 404)', () => {
    it('should return standardized 404 JSON error response', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/non-existent-endpoint',
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.payload);
      expect(body).toHaveProperty('success', false);
      expect(body).toHaveProperty('error');
      expect(body.error).toHaveProperty('code', 'ROUTE_NOT_FOUND');
      expect(body.error).toHaveProperty('statusCode', 404);
      expect(body.error).toHaveProperty('requestId');
    });
  });

  describe('GET /docs (OpenAPI / Swagger UI)', () => {
    it('should serve Swagger UI documentation endpoint', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/docs/',
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toContain('text/html');
    });
  });
});
