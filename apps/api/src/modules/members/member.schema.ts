import { FastifySchema } from 'fastify';

export const listMembersSchema: FastifySchema = {
  tags: ['Members'],
  summary: 'List organization members',
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
              userId: { type: 'string' },
              status: { type: 'string' },
              joinedAt: { type: 'string' },
              createdAt: { type: 'string' },
              updatedAt: { type: 'string' },
              user: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  email: { type: 'string' },
                  firstName: { type: 'string', nullable: true },
                  lastName: { type: 'string', nullable: true },
                },
              },
              roles: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    name: { type: 'string' },
                  },
                },
              },
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

export const inviteMemberSchema: FastifySchema = {
  tags: ['Members'],
  summary: 'Invite member to organization',
  headers: {
    type: 'object',
    properties: {
      'x-user-id': { type: 'string', format: 'uuid' },
      'x-organization-id': { type: 'string', format: 'uuid' },
    },
  },
  body: {
    type: 'object',
    required: ['email', 'roleId'],
    properties: {
      email: { type: 'string', format: 'email' },
      roleId: { type: 'string', format: 'uuid' },
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
            email: { type: 'string' },
            roleId: { type: 'string' },
            status: { type: 'string' },
            expiresAt: { type: 'string' },
            createdAt: { type: 'string' },
          },
        },
      },
    },
  },
};

export const updateMemberSchema: FastifySchema = {
  tags: ['Members'],
  summary: 'Update organization member',
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
      status: { type: 'string', enum: ['active', 'invited', 'suspended'] },
      roleIds: { type: 'array', items: { type: 'string', format: 'uuid' } },
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
            userId: { type: 'string' },
            status: { type: 'string' },
            updatedAt: { type: 'string' },
          },
        },
      },
    },
  },
};

export const deleteMemberSchema: FastifySchema = {
  tags: ['Members'],
  summary: 'Remove member from organization',
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
