import { FastifySchema } from 'fastify';

export const listRolesSchema: FastifySchema = {
  tags: ['Roles'],
  summary: 'List organization roles',
  headers: {
    type: 'object',
    properties: {
      'x-user-id': { type: 'string', format: 'uuid' },
      'x-organization-id': { type: 'string', format: 'uuid' },
    },
  },
  response: {
    200: {
      type: 'object',
      required: ['success', 'data'],
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              organizationId: { type: 'string' },
              name: { type: 'string' },
              description: { type: 'string', nullable: true },
              isSystem: { type: 'boolean' },
              createdAt: { type: 'string' },
              updatedAt: { type: 'string' },
              permissions: { type: 'array', items: { type: 'string' } },
            },
          },
        },
      },
    },
  },
};

export const createRoleSchema: FastifySchema = {
  tags: ['Roles'],
  summary: 'Create custom organization role',
  headers: {
    type: 'object',
    properties: {
      'x-user-id': { type: 'string', format: 'uuid' },
      'x-organization-id': { type: 'string', format: 'uuid' },
    },
  },
  body: {
    type: 'object',
    required: ['name'],
    properties: {
      name: { type: 'string', minLength: 2, maxLength: 100 },
      description: { type: 'string', maxLength: 500 },
      permissionKeys: { type: 'array', items: { type: 'string' } },
    },
  },
  response: {
    201: {
      type: 'object',
      required: ['success', 'data'],
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            organizationId: { type: 'string' },
            name: { type: 'string' },
            description: { type: 'string', nullable: true },
            isSystem: { type: 'boolean' },
            createdAt: { type: 'string' },
            updatedAt: { type: 'string' },
            permissions: { type: 'array', items: { type: 'string' } },
          },
        },
      },
    },
  },
};

export const updateRoleSchema: FastifySchema = {
  tags: ['Roles'],
  summary: 'Update organization role',
  params: {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'string', format: 'uuid' },
    },
  },
  headers: {
    type: 'object',
    properties: {
      'x-user-id': { type: 'string', format: 'uuid' },
      'x-organization-id': { type: 'string', format: 'uuid' },
    },
  },
  body: {
    type: 'object',
    properties: {
      name: { type: 'string', minLength: 2, maxLength: 100 },
      description: { type: 'string', maxLength: 500 },
      permissionKeys: { type: 'array', items: { type: 'string' } },
    },
  },
  response: {
    200: {
      type: 'object',
      required: ['success', 'data'],
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            organizationId: { type: 'string' },
            name: { type: 'string' },
            description: { type: 'string', nullable: true },
            isSystem: { type: 'boolean' },
            updatedAt: { type: 'string' },
            permissions: { type: 'array', items: { type: 'string' } },
          },
        },
      },
    },
  },
};

export const deleteRoleSchema: FastifySchema = {
  tags: ['Roles'],
  summary: 'Delete organization role',
  params: {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'string', format: 'uuid' },
    },
  },
  headers: {
    type: 'object',
    properties: {
      'x-user-id': { type: 'string', format: 'uuid' },
      'x-organization-id': { type: 'string', format: 'uuid' },
    },
  },
  response: {
    200: {
      type: 'object',
      required: ['success', 'message'],
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
      },
    },
  },
};
