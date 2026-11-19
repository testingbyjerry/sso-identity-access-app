import { FastifySchema } from 'fastify';

export const listAuditLogsSchema: FastifySchema = {
  tags: ['Audit Logs'],
  summary: 'List tenant audit logs',
  description: 'Returns immutable audit trail for the tenant organization.',
  headers: {
    type: 'object',
    properties: {
      'x-user-id': { type: 'string', format: 'uuid' },
      'x-organization-id': { type: 'string', format: 'uuid' },
    },
  },
  querystring: {
    type: 'object',
    properties: {
      page: { type: 'number', default: 1 },
      limit: { type: 'number', default: 20 },
      action: { type: 'string' },
      entityType: { type: 'string' },
      actorUserId: { type: 'string', format: 'uuid' },
    },
  },
  response: {
    200: {
      type: 'object',
      required: ['success', 'data', 'pagination'],
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              organizationId: { type: 'string' },
              actorUserId: { type: 'string', nullable: true },
              action: { type: 'string' },
              entityType: { type: 'string' },
              entityId: { type: 'string', nullable: true },
              ipAddress: { type: 'string', nullable: true },
              userAgent: { type: 'string', nullable: true },
              metadata: { type: 'object' },
              createdAt: { type: 'string' },
            },
          },
        },
        pagination: {
          type: 'object',
          properties: {
            page: { type: 'number' },
            limit: { type: 'number' },
            total: { type: 'number' },
            totalPages: { type: 'number' },
            hasNextPage: { type: 'boolean' },
            hasPrevPage: { type: 'boolean' },
          },
        },
      },
    },
  },
};
