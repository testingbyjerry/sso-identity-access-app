import { FastifyInstance } from 'fastify';
import { requireTenantContext } from '../../common/tenant-context.js';
import { IdentityProviderController } from './identity-provider.controller.js';
import {
  createIdpSchema,
  deleteIdpSchema,
  getIdpSchema,
  listIdpsSchema,
  testIdpSchema,
  updateIdpSchema,
} from './identity-provider.schema.js';

export async function identityProviderRoutes(app: FastifyInstance): Promise<void> {
  const controller = new IdentityProviderController();

  app.get(
    '/identity-providers',
    {
      preHandler: [requireTenantContext],
      schema: listIdpsSchema,
    },
    (req, rep) => controller.list(req, rep)
  );

  app.get(
    '/identity-providers/:id',
    {
      preHandler: [requireTenantContext],
      schema: getIdpSchema,
    },
    (req, rep) => controller.getById(req, rep)
  );

  app.post(
    '/identity-providers/:id/test',
    {
      preHandler: [requireTenantContext],
      schema: testIdpSchema,
    },
    (req, rep) => controller.test(req, rep)
  );

  app.post(
    '/identity-providers',
    {
      preHandler: [requireTenantContext],
      schema: createIdpSchema,
    },
    (req, rep) => controller.create(req, rep)
  );

  app.patch(
    '/identity-providers/:id',
    {
      preHandler: [requireTenantContext],
      schema: updateIdpSchema,
    },
    (req, rep) => controller.update(req, rep)
  );

  app.delete(
    '/identity-providers/:id',
    {
      preHandler: [requireTenantContext],
      schema: deleteIdpSchema,
    },
    (req, rep) => controller.delete(req, rep)
  );
}
