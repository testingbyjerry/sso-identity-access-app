import { FastifyInstance } from 'fastify';
import { requireTenantContext } from '../../common/tenant-context.js';
import { RoleController } from './role.controller.js';
import {
  createRoleSchema,
  deleteRoleSchema,
  listRolesSchema,
  updateRoleSchema,
} from './role.schema.js';

export async function roleRoutes(app: FastifyInstance): Promise<void> {
  const controller = new RoleController();

  app.get(
    '/roles',
    {
      preHandler: [requireTenantContext],
      schema: listRolesSchema,
    },
    (req, rep) => controller.list(req, rep)
  );

  app.post(
    '/roles',
    {
      preHandler: [requireTenantContext],
      schema: createRoleSchema,
    },
    (req, rep) => controller.create(req, rep)
  );

  app.patch(
    '/roles/:id',
    {
      preHandler: [requireTenantContext],
      schema: updateRoleSchema,
    },
    (req, rep) => controller.update(req, rep)
  );

  app.delete(
    '/roles/:id',
    {
      preHandler: [requireTenantContext],
      schema: deleteRoleSchema,
    },
    (req, rep) => controller.delete(req, rep)
  );
}
