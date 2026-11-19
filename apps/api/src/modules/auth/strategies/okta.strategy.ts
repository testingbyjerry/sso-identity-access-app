import { OidcStrategy, VerifiedOidcProfile } from './oidc.strategy.js';

export interface OktaConfig {
  oktaDomain: string; // e.g., 'dev-12345.okta.com'
  authServerId?: string; // e.g., 'default'
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes?: string[];
}

export class OktaStrategy extends OidcStrategy {
  /**
   * Derive the Okta authorization server issuer URL.
   */
  static getIssuerUrl(oktaDomain: string, authServerId = 'default'): string {
    const cleanDomain = oktaDomain.replace(/^https?:\/\//, '').replace(/\/$/, '');
    return authServerId
      ? `https://${cleanDomain}/oauth2/${authServerId}`
      : `https://${cleanDomain}`;
  }

  /**
   * Override claims mapping for Okta identity tokens.
   */
  override mapClaimsToProfile(claims: Record<string, unknown>): VerifiedOidcProfile {
    const externalSubjectId = String(claims.sub || '');
    if (!externalSubjectId) {
      throw new Error('Missing Okta subject identifier (sub) in ID token claims');
    }

    const email = String(claims.email || claims.preferred_username || '').toLowerCase();
    if (!email) {
      throw new Error('Missing email in Okta ID token claims');
    }

    let firstName: string | undefined = typeof claims.given_name === 'string' ? claims.given_name : undefined;
    let lastName: string | undefined = typeof claims.family_name === 'string' ? claims.family_name : undefined;

    if (!firstName && typeof claims.name === 'string') {
      const parts = claims.name.split(' ');
      firstName = parts[0];
      lastName = parts.slice(1).join(' ') || undefined;
    }

    const emailVerified =
      typeof claims.email_verified === 'boolean' ? claims.email_verified : true;

    return {
      externalSubjectId,
      email,
      firstName,
      lastName,
      emailVerified,
      rawClaims: claims,
    };
  }
}

export const oktaStrategy = new OktaStrategy();
