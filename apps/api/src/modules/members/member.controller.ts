import { FastifyReply, FastifyRequest } from 'fastify';
import { MemberService } from './member.service.js';
import { InviteMemberDTO, MemberQueryDTO, UpdateMemberDTO } from './member.types.js';

export class MemberController {
  constructor(private memberService = new MemberService()) {}

  async list(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const tenantId = request.tenantContext!.organizationId;
    const query = request.query as MemberQueryDTO;

    const result = await this.memberService.listMembers(tenantId, query.page, query.limit);
    reply.status(200).send(result);
  }

  async invite(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const tenantId = request.tenantContext!.organizationId;
    const actorUserId = request.tenantContext!.userId;
    const body = request.body as InviteMemberDTO;

    const invitation = await this.memberService.inviteMember(tenantId, actorUserId, body);
    reply.status(201).send({ success: true, data: invitation });
  }

  async update(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const tenantId = request.tenantContext!.organizationId;
    const actorUserId = request.tenantContext!.userId;
    const { id } = request.params as { id: string };
    const body = request.body as UpdateMemberDTO;

    const member = await this.memberService.updateMember(tenantId, id, actorUserId, body);
    reply.status(200).send({ success: true, data: member });
  }

  async remove(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const tenantId = request.tenantContext!.organizationId;
    const actorUserId = request.tenantContext!.userId;
    const { id } = request.params as { id: string };

    const result = await this.memberService.removeMember(tenantId, id, actorUserId);
    reply.status(200).send(result);
  }
}
