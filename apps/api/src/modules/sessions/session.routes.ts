import { FastifyInstance } from 'fastify';
import { requireAuth } from '../../common/auth-guard.js';
import { sessionController } from './session.controller.js';
import {
  listSessionsSwaggerSchema,
  revokeAllSessionsSwaggerSchema,
  revokeSessionSwaggerSchema,
} from './session.schema.js';

export async function sessionRoutes(app: FastifyInstance): Promise<void> {
  // All session management routes require authenticated session
  app.addHook('preHandler', requireAuth);

  app.get('/sessions', { schema: listSessionsSwaggerSchema }, sessionController.listSessions);

  app.delete(
    '/sessions/:id',
    { schema: revokeSessionSwaggerSchema },
    sessionController.revokeSession
  );

  app.delete(
    '/sessions',
    { schema: revokeAllSessionsSwaggerSchema },
    sessionController.revokeAllOtherSessions
  );
}
