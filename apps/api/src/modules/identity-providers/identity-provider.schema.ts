import { FastifySchema } from 'fastify';

export const listIdpsSchema: FastifySchema = {
  tags: ['Identity Providers'],
  summary: 'List organization Identity Providers',
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
              type: { type: 'string' },
              name: { type: 'string' },
              slug: { type: 'string' },
              enabled: { type: 'boolean' },
              domains: { type: 'array', items: { type: 'string' } },
              config: { type: 'object', additionalProperties: true },
              metadata: { type: 'object' },
              createdAt: { type: 'string' },
              updatedAt: { type: 'string' },
            },
          },
        },
      },
    },
  },
};

export const createIdpSchema: FastifySchema = {
  tags: ['Identity Providers'],
  summary: 'Configure enterprise Identity Provider',
  headers: {
    type: 'object',
    properties: {
      'x-user-id': { type: 'string', format: 'uuid' },
      'x-organization-id': { type: 'string', format: 'uuid' },
    },
  },
  body: {
    type: 'object',
    required: ['type', 'name', 'slug'],
    properties: {
      type: {
        type: 'string',
        enum: ['saml', 'oidc', 'google', 'microsoft', 'github'],
      },
      name: { type: 'string', minLength: 2, maxLength: 100 },
      slug: { type: 'string', minLength: 2, maxLength: 50 },
      enabled: { type: 'boolean', default: true },
      domains: { type: 'array', items: { type: 'string' } },
      config: { type: 'object' },
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
            organizationId: { type: 'string' },
            type: { type: 'string' },
            name: { type: 'string' },
            slug: { type: 'string' },
            enabled: { type: 'boolean' },
            domains: { type: 'array', items: { type: 'string' } },
            config: { type: 'object', additionalProperties: true },
            createdAt: { type: 'string' },
            updatedAt: { type: 'string' },
          },
        },
      },
    },
  },
};

export const updateIdpSchema: FastifySchema = {
  tags: ['Identity Providers'],
  summary: 'Update Identity Provider',
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
      enabled: { type: 'boolean' },
      domains: { type: 'array', items: { type: 'string' } },
      config: { type: 'object' },
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
            organizationId: { type: 'string' },
            type: { type: 'string' },
            name: { type: 'string' },
            slug: { type: 'string' },
            enabled: { type: 'boolean' },
            domains: { type: 'array', items: { type: 'string' } },
            config: { type: 'object', additionalProperties: true },
            updatedAt: { type: 'string' },
          },
        },
      },
    },
  },
};

export const deleteIdpSchema: FastifySchema = {
  tags: ['Identity Providers'],
  summary: 'Delete Identity Provider',
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

export const getIdpSchema: FastifySchema = {
  tags: ['Identity Providers'],
  summary: 'Get Identity Provider by ID',
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
      required: ['success', 'data'],
      properties: {
        success: { type: 'boolean' },
        data: { type: 'object', additionalProperties: true },
      },
    },
  },
};

export const testIdpSchema: FastifySchema = {
  tags: ['Identity Providers'],
  summary: 'Test OIDC discovery and JWKS endpoint connectivity for an Identity Provider',
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
      required: ['success', 'data'],
      properties: {
        success: { type: 'boolean' },
        data: { type: 'object', additionalProperties: true },
      },
    },
  },
};

