import { OidcStrategy, VerifiedOidcProfile } from './oidc.strategy.js';

export interface EntraConfig {
  tenantId?: string; // Microsoft Directory (Tenant) ID; default 'common'
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes?: string[];
}

export class EntraStrategy extends OidcStrategy {
  /**
   * Derive the Microsoft Entra v2.0 issuer URL from a tenant ID.
   */
  static getIssuerUrl(tenantId = 'common'): string {
    return `https://login.microsoftonline.com/${tenantId}/v2.0`;
  }

  /**
   * Override claims mapping to handle Microsoft-specific claims (oid, preferred_username, upn).
   */
  override mapClaimsToProfile(claims: Record<string, unknown>): VerifiedOidcProfile {
    // Entra provides `oid` as the immutable user object ID, fallback to `sub`
    const externalSubjectId = String(claims.oid || claims.sub || '');
    if (!externalSubjectId) {
      throw new Error('Missing Microsoft object ID (oid) or subject (sub) in ID token claims');
    }

    // Entra provides preferred_username or email or upn
    const email = String(
      claims.email || claims.preferred_username || claims.upn || claims.unique_name || ''
    ).toLowerCase();

    if (!email) {
      throw new Error('Missing email or preferred_username in Microsoft ID token claims');
    }

    let firstName: string | undefined = typeof claims.given_name === 'string' ? claims.given_name : undefined;
    let lastName: string | undefined = typeof claims.family_name === 'string' ? claims.family_name : undefined;

    if (!firstName && typeof claims.name === 'string') {
      const parts = claims.name.split(' ');
      firstName = parts[0];
      lastName = parts.slice(1).join(' ') || undefined;
    }

    return {
      externalSubjectId,
      email,
      firstName,
      lastName,
      emailVerified: true, // Entra enterprise directories enforce email ownership
      rawClaims: claims,
    };
  }
}

export const entraStrategy = new EntraStrategy();
