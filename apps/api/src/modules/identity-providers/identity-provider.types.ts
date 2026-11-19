import type {
  CreateIdentityProviderInput,
  PaginationQuery,
  UpdateIdentityProviderInput,
} from '@sso/validation';
import type { IdentityProviderDTO } from '@sso/shared';

export type CreateIdpDTO = CreateIdentityProviderInput;
export type UpdateIdpDTO = UpdateIdentityProviderInput;
export type IdpQueryDTO = PaginationQuery;
export type IdpResultDTO = IdentityProviderDTO;
