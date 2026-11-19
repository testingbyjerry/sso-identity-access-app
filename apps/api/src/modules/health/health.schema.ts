import { FastifySchema } from 'fastify';

export const healthSchema: FastifySchema = {
  tags: ['System'],
  summary: 'Liveness probe',
  description: 'Returns 200 OK if the API server process is alive and responsive.',
  response: {
    200: {
      type: 'object',
      required: ['status', 'timestamp', 'uptime', 'environment', 'version'],
      properties: {
        status: { type: 'string', enum: ['ok', 'degraded', 'error'] },
        timestamp: { type: 'string', format: 'date-time' },
        uptime: { type: 'number' },
        environment: { type: 'string' },
        version: { type: 'string' },
      },
    },
  },
};

export const readySchema: FastifySchema = {
  tags: ['System'],
  summary: 'Readiness probe',
  description:
    'Returns 200 OK if the API server and all backing dependencies (PostgreSQL) are operational.',
  response: {
    200: {
      type: 'object',
      required: ['status', 'timestamp', 'uptime', 'checks'],
      properties: {
        status: { type: 'string', enum: ['ready', 'not_ready'] },
        timestamp: { type: 'string', format: 'date-time' },
        uptime: { type: 'number' },
        checks: {
          type: 'object',
          required: ['database'],
          properties: {
            database: {
              type: 'object',
              required: ['status'],
              properties: {
                status: { type: 'string', enum: ['connected', 'disconnected'] },
                latencyMs: { type: 'number' },
                error: { type: 'string' },
              },
            },
          },
        },
      },
    },
    503: {
      type: 'object',
      required: ['status', 'timestamp', 'uptime', 'checks'],
      properties: {
        status: { type: 'string', enum: ['not_ready'] },
        timestamp: { type: 'string', format: 'date-time' },
        uptime: { type: 'number' },
        checks: {
          type: 'object',
          properties: {
            database: {
              type: 'object',
              properties: {
                status: { type: 'string', enum: ['connected', 'disconnected'] },
                latencyMs: { type: 'number' },
                error: { type: 'string' },
              },
            },
          },
        },
      },
    },
  },
};
