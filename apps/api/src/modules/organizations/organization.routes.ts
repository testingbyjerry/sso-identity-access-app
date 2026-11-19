import { FastifyInstance } from 'fastify';
import { requireTenantContext } from '../../common/tenant-context.js';
import { OrganizationController } from './organization.controller.js';
import {
  createOrganizationSchema,
  getOrganizationSchema,
  listOrganizationsSchema,
  updateOrganizationSchema,
} from './organization.schema.js';

export async function organizationRoutes(app: FastifyInstance): Promise<void> {
  const controller = new OrganizationController();

  // List all organizations the user belongs to
  app.get('/organizations', { schema: listOrganizationsSchema }, (req, rep) =>
    controller.list(req, rep)
  );

  // Create a new organization
  app.post('/organizations', { schema: createOrganizationSchema }, (req, rep) =>
    controller.create(req, rep)
  );

  // Get details of a specific organization (requires validated membership in that org)
  app.get(
    '/organizations/:id',
    {
      preHandler: [requireTenantContext],
      schema: getOrganizationSchema,
    },
    (req, rep) => controller.getById(req, rep)
  );

  // Update organization settings (requires membership)
  app.patch(
    '/organizations/:id',
    {
      preHandler: [requireTenantContext],
      schema: updateOrganizationSchema,
    },
    (req, rep) => controller.update(req, rep)
  );
}
