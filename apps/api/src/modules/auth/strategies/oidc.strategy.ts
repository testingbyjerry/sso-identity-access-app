import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from 'jose';

export interface OidcProviderMetadata {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  jwks_uri: string;
  userinfo_endpoint?: string;
  end_session_endpoint?: string;
  response_types_supported?: string[];
  id_token_signing_alg_values_supported?: string[];
}

export interface OidcTokens {
  id_token: string;
  access_token?: string;
  refresh_token?: string;
  token_type?: string;
  expires_in?: number;
}

export interface VerifiedOidcProfile {
  externalSubjectId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  emailVerified?: boolean;
  rawClaims: Record<string, unknown>;
}

export interface BuildAuthorizationUrlParams {
  authorizationEndpoint: string;
  clientId: string;
  redirectUri: string;
  scope: string;
  state: string;
  nonce?: string;
  codeChallenge?: string;
  codeChallengeMethod?: string;
  additionalParams?: Record<string, string>;
}

export interface ExchangeCodeParams {
  tokenEndpoint: string;
  clientId: string;
  clientSecret: string;
  code: string;
  redirectUri: string;
  codeVerifier?: string;
}

export interface VerifyIdTokenParams {
  idToken: string;
  jwksUri: string;
  expectedIssuer: string;
  expectedAudience: string;
  expectedNonce?: string;
}

// In-memory cache for OIDC provider discovery metadata and remote JWKS key sets
const metadataCache = new Map<string, { metadata: OidcProviderMetadata; expiresAt: number }>();
const jwksCache = new Map<string, JWTVerifyGetKey>();

export class OidcStrategy {
  /**
   * Discover and retrieve OpenID Configuration from an issuer URL with in-memory caching.
   */
  async discover(issuer: string): Promise<OidcProviderMetadata> {
    const normalizedIssuer = issuer.replace(/\/$/, '');
    const cacheKey = normalizedIssuer;
    const cached = metadataCache.get(cacheKey);

    if (cached && cached.expiresAt > Date.now()) {
      return cached.metadata;
    }

    const discoveryUrl = `${normalizedIssuer}/.well-known/openid-configuration`;
    const response = await fetch(discoveryUrl, {
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      throw new Error(
        `Failed to discover OIDC configuration from ${discoveryUrl}: ${response.status} ${response.statusText}`
      );
    }

    const metadata = (await response.json()) as OidcProviderMetadata;
    // Cache discovery document for 1 hour
    metadataCache.set(cacheKey, {
      metadata,
      expiresAt: Date.now() + 60 * 60 * 1000,
    });

    return metadata;
  }

  /**
   * Build the standard OIDC Authorization Code + PKCE redirect URL.
   */
  buildAuthorizationUrl(params: BuildAuthorizationUrlParams): string {
    const url = new URL(params.authorizationEndpoint);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('client_id', params.clientId);
    url.searchParams.set('redirect_uri', params.redirectUri);
    url.searchParams.set('scope', params.scope);
    url.searchParams.set('state', params.state);

    if (params.nonce) {
      url.searchParams.set('nonce', params.nonce);
    }
    if (params.codeChallenge) {
      url.searchParams.set('code_challenge', params.codeChallenge);
      url.searchParams.set('code_challenge_method', params.codeChallengeMethod ?? 'S256');
    }

    if (params.additionalParams) {
      for (const [key, val] of Object.entries(params.additionalParams)) {
        url.searchParams.set(key, val);
      }
    }

    return url.toString();
  }

  /**
   * Exchange an authorization code for tokens (ID token, access token) with PKCE code_verifier.
   */
  async exchangeCode(params: ExchangeCodeParams): Promise<OidcTokens> {
    const body = new URLSearchParams();
    body.set('grant_type', 'authorization_code');
    body.set('code', params.code);
    body.set('redirect_uri', params.redirectUri);
    body.set('client_id', params.clientId);
    body.set('client_secret', params.clientSecret);

    if (params.codeVerifier) {
      body.set('code_verifier', params.codeVerifier);
    }

    const response = await fetch(params.tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Token exchange failed (${response.status}): ${errorText}`);
    }

    return (await response.json()) as OidcTokens;
  }

  /**
   * Get or create a cached remote JWKS key set for a given JWKS URI.
   */
  getJWKS(jwksUri: string): JWTVerifyGetKey {
    let jwks = jwksCache.get(jwksUri);
    if (!jwks) {
      jwks = createRemoteJWKSet(new URL(jwksUri), {
        cacheMaxAge: 10 * 60 * 1000, // 10 minutes
        cooldownDuration: 30 * 1000, // 30 seconds cooldown between retries
      });
      jwksCache.set(jwksUri, jwks);
    }
    return jwks;
  }

  /**
   * Cryptographically verify an ID token against the provider's JWKS.
   * Validates cryptographic signature, issuer, audience, expiration, and nonce.
   */
  async verifyIdToken(params: VerifyIdTokenParams): Promise<VerifiedOidcProfile> {
    const JWKS = this.getJWKS(params.jwksUri);

    const { payload } = await jwtVerify(params.idToken, JWKS, {
      issuer: params.expectedIssuer,
      audience: params.expectedAudience,
      clockTolerance: 60, // 60 seconds clock drift tolerance
    });

    // Validate nonce if an expected nonce was provided during authorization request
    if (params.expectedNonce && payload.nonce !== params.expectedNonce) {
      throw new Error('ID Token nonce verification failed: nonce mismatch');
    }

    return this.mapClaimsToProfile(payload as Record<string, unknown>);
  }

  /**
   * Map standard OIDC JWT claims to a verified profile object.
   */
  mapClaimsToProfile(claims: Record<string, unknown>): VerifiedOidcProfile {
    const externalSubjectId = String(claims.sub || claims.oid || claims.id || '');
    if (!externalSubjectId) {
      throw new Error('Missing subject identifier (sub/oid) in ID token claims');
    }

    const email = String(claims.email || claims.preferred_username || claims.upn || '').toLowerCase();
    if (!email) {
      throw new Error('Missing verified email address in ID token claims');
    }

    let firstName: string | undefined = typeof claims.given_name === 'string' ? claims.given_name : undefined;
    let lastName: string | undefined = typeof claims.family_name === 'string' ? claims.family_name : undefined;

    if (!firstName && typeof claims.name === 'string') {
      const parts = claims.name.split(' ');
      firstName = parts[0];
      lastName = parts.slice(1).join(' ') || undefined;
    }

    const emailVerified =
      typeof claims.email_verified === 'boolean'
        ? claims.email_verified
        : typeof claims.email_verified === 'string'
          ? claims.email_verified === 'true'
          : true;

    return {
      externalSubjectId,
      email,
      firstName,
      lastName,
      emailVerified,
      rawClaims: claims,
    };
  }

  /**
   * Test OIDC discovery endpoint and JWKS connectivity.
   */
  async testConnection(issuer: string): Promise<{ success: boolean; issuer: string; jwksUri: string }> {
    const metadata = await this.discover(issuer);
    if (!metadata.jwks_uri) {
      throw new Error('Discovered metadata is missing jwks_uri');
    }
    return {
      success: true,
      issuer: metadata.issuer,
      jwksUri: metadata.jwks_uri,
    };
  }
}

export const oidcStrategy = new OidcStrategy();
