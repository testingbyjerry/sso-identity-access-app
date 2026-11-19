import type { InviteMemberInput, PaginationQuery, UpdateMemberInput } from '@sso/validation';
import type { MemberDTO } from '@sso/shared';

export type InviteMemberDTO = InviteMemberInput;
export type UpdateMemberDTO = UpdateMemberInput;
export type MemberQueryDTO = PaginationQuery;
export type MemberResultDTO = MemberDTO;
