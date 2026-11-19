import type {
  CreateOrganizationInput,
  PaginationQuery,
  UpdateOrganizationInput,
} from '@sso/validation';
import type { OrganizationDTO } from '@sso/shared';

export type CreateOrgDTO = CreateOrganizationInput;
export type UpdateOrgDTO = UpdateOrganizationInput;
export type OrgQueryDTO = PaginationQuery;
export type OrgResultDTO = OrganizationDTO;
