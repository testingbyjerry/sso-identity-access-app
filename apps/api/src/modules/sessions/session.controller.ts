import { HttpStatus } from '@sso/shared';
import { FastifyReply, FastifyRequest } from 'fastify';
import { sessionService, SessionService } from './session.service.js';

export class SessionController {
  constructor(private readonly service: SessionService = sessionService) {}

  listSessions = async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.user!.id;
    const sessions = await this.service.getUserSessions(userId);

    return reply.status(HttpStatus.OK).send({
      success: true,
      data: sessions,
    });
  };

  revokeSession = async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) => {
    const userId = request.user!.id;
    const sessionId = request.params.id;

    await this.service.revokeSession(sessionId, userId);

    return reply.status(HttpStatus.OK).send({
      success: true,
      data: { revoked: true },
    });
  };

  revokeAllOtherSessions = async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.user!.id;
    const currentSessionId = request.session?.id;

    const revokedCount = await this.service.revokeAllUserSessions(userId, currentSessionId);

    return reply.status(HttpStatus.OK).send({
      success: true,
      data: { revokedCount },
    });
  };
}

export const sessionController = new SessionController();
