import { FastifyInstance } from 'fastify';
import { requireTenantContext } from '../../common/tenant-context.js';
import { MemberController } from './member.controller.js';
import {
  deleteMemberSchema,
  inviteMemberSchema,
  listMembersSchema,
  updateMemberSchema,
} from './member.schema.js';

export async function memberRoutes(app: FastifyInstance): Promise<void> {
  const controller = new MemberController();

  app.get(
    '/members',
    {
      preHandler: [requireTenantContext],
      schema: listMembersSchema,
    },
    (req, rep) => controller.list(req, rep)
  );

  app.post(
    '/members/invite',
    {
      preHandler: [requireTenantContext],
      schema: inviteMemberSchema,
    },
    (req, rep) => controller.invite(req, rep)
  );

  app.patch(
    '/members/:id',
    {
      preHandler: [requireTenantContext],
      schema: updateMemberSchema,
    },
    (req, rep) => controller.update(req, rep)
  );

  app.delete(
    '/members/:id',
    {
      preHandler: [requireTenantContext],
      schema: deleteMemberSchema,
    },
    (req, rep) => controller.remove(req, rep)
  );
}
