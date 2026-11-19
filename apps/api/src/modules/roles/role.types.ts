import type { CreateRoleInput, PaginationQuery, UpdateRoleInput } from '@sso/validation';
import type { RoleDTO } from '@sso/shared';

export type CreateRoleDTO = CreateRoleInput;
export type UpdateRoleDTO = UpdateRoleInput;
export type RoleQueryDTO = PaginationQuery;
export type RoleResultDTO = RoleDTO;
