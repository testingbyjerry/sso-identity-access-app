import { idParamSchema } from '@sso/validation';

export const sessionParamSchema = idParamSchema;

export const listSessionsSwaggerSchema = {
  description: 'List all active sessions for the current authenticated user',
  tags: ['Sessions'],
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              userId: { type: 'string' },
              activeOrganizationId: { type: 'string', nullable: true },
              userAgent: { type: 'string', nullable: true },
              ipAddress: { type: 'string', nullable: true },
              expiresAt: { type: 'string' },
              createdAt: { type: 'string' },
              updatedAt: { type: 'string' },
            },
          },
        },
      },
    },
  },
};

export const revokeSessionSwaggerSchema = {
  description: 'Revoke a specific user session by session ID',
  tags: ['Sessions'],
  params: {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'string', format: 'uuid' },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            revoked: { type: 'boolean', example: true },
          },
        },
      },
    },
  },
};

export const revokeAllSessionsSwaggerSchema = {
  description: 'Revoke all other active sessions for current user except the current one',
  tags: ['Sessions'],
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            revokedCount: { type: 'number', example: 2 },
          },
        },
      },
    },
  },
};
