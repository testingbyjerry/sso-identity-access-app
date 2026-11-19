import { FastifySchema } from 'fastify';

export const listOrganizationsSchema: FastifySchema = {
  tags: ['Organizations'],
  summary: 'List user organizations',
  description: 'Returns all organizations the authenticated user belongs to.',
  headers: {
    type: 'object',
    properties: {
      'x-user-id': { type: 'string', format: 'uuid' },
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
              name: { type: 'string' },
              slug: { type: 'string' },
              domain: { type: 'string', nullable: true },
              status: { type: 'string' },
              createdAt: { type: 'string' },
              updatedAt: { type: 'string' },
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

export const getOrganizationSchema: FastifySchema = {
  tags: ['Organizations'],
  summary: 'Get organization details',
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
            name: { type: 'string' },
            slug: { type: 'string' },
            domain: { type: 'string', nullable: true },
            status: { type: 'string' },
            metadata: { type: 'object' },
            createdAt: { type: 'string' },
            updatedAt: { type: 'string' },
          },
        },
      },
    },
  },
};

export const createOrganizationSchema: FastifySchema = {
  tags: ['Organizations'],
  summary: 'Create a new organization',
  headers: {
    type: 'object',
    properties: {
      'x-user-id': { type: 'string', format: 'uuid' },
    },
  },
  body: {
    type: 'object',
    required: ['name', 'slug'],
    properties: {
      name: { type: 'string', minLength: 2, maxLength: 100 },
      slug: { type: 'string', minLength: 2, maxLength: 50 },
      domain: { type: 'string' },
      metadata: { type: 'object' },
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
            name: { type: 'string' },
            slug: { type: 'string' },
            domain: { type: 'string', nullable: true },
            status: { type: 'string' },
            createdAt: { type: 'string' },
            updatedAt: { type: 'string' },
          },
        },
      },
    },
  },
};

export const updateOrganizationSchema: FastifySchema = {
  tags: ['Organizations'],
  summary: 'Update organization settings',
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
    },
  },
  body: {
    type: 'object',
    properties: {
      name: { type: 'string', minLength: 2, maxLength: 100 },
      domain: { type: 'string' },
      status: { type: 'string', enum: ['active', 'suspended', 'pending'] },
      metadata: { type: 'object' },
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
            name: { type: 'string' },
            slug: { type: 'string' },
            domain: { type: 'string', nullable: true },
            status: { type: 'string' },
            metadata: { type: 'object' },
            createdAt: { type: 'string' },
            updatedAt: { type: 'string' },
          },
        },
      },
    },
  },
};
