import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { FastifyInstance } from 'fastify';
import {
  closeDatabase,
  getDatabase,
  identityProviders,
  organizations,
  passwordResetTokens,
  sessions,
  ssoTransactions,
  users,
  withSystemTransaction,
} from '@sso/database';
import { generateKeyPair, SignJWT } from 'jose';
import { eq } from 'drizzle-orm';
import { buildApp } from '../src/app.js';
import {
  generateOpaqueToken,
  hashPassword,
  hashToken,
} from '../src/common/crypto.js';
import { oidcStrategy } from '../src/modules/auth/strategies/oidc.strategy.js';

describe('Phase 5 — Security Hardening & Edge-Case Testing', () => {
  let app: FastifyInstance;
  const db = getDatabase();

  let testOrgId: string;
  let testUserId: string;
  let disabledIdpId: string;

  // Keypairs for cryptographic signature verification tests
  let realPrivateKey: Awaited<ReturnType<typeof generateKeyPair>>['privateKey'];
  let realPublicKey: Awaited<ReturnType<typeof generateKeyPair>>['publicKey'];
  let foreignPrivateKey: Awaited<ReturnType<typeof generateKeyPair>>['privateKey'];

  beforeAll(async () => {
    app = await buildApp({ logger: false });
    await app.ready();

    const timestamp = Date.now();

    // Generate keys
    const realKp = await generateKeyPair('RS256');
    realPrivateKey = realKp.privateKey;
    realPublicKey = realKp.publicKey;

    const foreignKp = await generateKeyPair('RS256');
    foreignPrivateKey = foreignKp.privateKey;

    await withSystemTransaction(async (tx) => {
      // Create Organization
      const [org] = await tx
        .insert(organizations)
        .values({
          name: 'Security Test Org',
          slug: `sec-org-${timestamp}`,
          domain: `security-${timestamp}.com`,
          status: 'active',
        })
        .returning();
      testOrgId = org!.id;

      // Create User
      const [u] = await tx
        .insert(users)
        .values({
          email: `sec-user-${timestamp}@example.com`,
          passwordHash: await hashPassword('Password123!'),
          status: 'active',
        })
        .returning();
      testUserId = u!.id;

      // Active IdP
      await tx
        .insert(identityProviders)
        .values({
          organizationId: testOrgId,
          type: 'oidc',
          name: 'Active Test IdP',
          slug: `act-idp-${timestamp}`,
          enabled: true,
          domains: [`security-${timestamp}.com`],
          config: {
            issuer: 'https://test-issuer.example.com',
            clientId: 'test-client-id',
            clientSecret: 'secret123',
          },
        })
        .returning();

      // Disabled IdP
      const [disIdp] = await tx
        .insert(identityProviders)
        .values({
          organizationId: testOrgId,
          type: 'oidc',
          name: 'Disabled Test IdP',
          slug: `dis-idp-${timestamp}`,
          enabled: false,
          domains: [`disabled-${timestamp}.com`],
          config: {
            issuer: 'https://disabled-issuer.example.com',
            clientId: 'disabled-client-id',
            clientSecret: 'secret123',
          },
        })
        .returning();
      disabledIdpId = disIdp!.id;
    });
  });

  afterAll(async () => {
    await app.close();
    await closeDatabase();
  });

  // =========================================================================
  // 1. Session Expiration & Revocation Security
  // =========================================================================
  describe('Session Security & Expiration', () => {
    it('rejects expired sessions with 401 Unauthorized', async () => {
      const rawToken = generateOpaqueToken();
      const tokenHash = hashToken(rawToken);

      // Insert expired session directly into DB
      await db.insert(sessions).values({
        userId: testUserId,
        activeOrganizationId: testOrgId,
        tokenHash,
        expiresAt: new Date(Date.now() - 5000), // Expired 5 seconds ago
      });

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/me',
        cookies: {
          sso_session: rawToken,
        },
      });

      expect(res.statusCode).toBe(401);
      const body = JSON.parse(res.payload);
      expect(body.success).toBe(false);
      expect(body.error.message).toMatch(/Session is invalid or expired/i);
    });

    it('rejects revoked sessions immediately upon deletion', async () => {
      const rawToken = generateOpaqueToken();
      const tokenHash = hashToken(rawToken);

      // Insert active session
      const [createdSession] = await db
        .insert(sessions)
        .values({
          userId: testUserId,
          activeOrganizationId: testOrgId,
          tokenHash,
          expiresAt: new Date(Date.now() + 60000),
        })
        .returning();

      // Verify it works initially
      const res1 = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/me',
        cookies: {
          sso_session: rawToken,
        },
      });
      expect(res1.statusCode).toBe(200);

      // Now revoke (delete) the session
      await db.delete(sessions).where(eq(sessions.id, createdSession!.id));

      // Attempt to access with the same token again -> must be rejected with 401
      const res2 = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/me',
        cookies: {
          sso_session: rawToken,
        },
      });
      expect(res2.statusCode).toBe(401);
    });
  });

  // =========================================================================
  // 2. Password Reset Security
  // =========================================================================
  describe('Password Reset Token Security', () => {
    it('rejects non-existent or tampered password reset tokens with 400 Bad Request', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/reset-password',
        payload: {
          token: 'non-existent-tampered-token-1234567890abcdef',
          newPassword: 'BrandNewSecurePassword123!',
        },
      });

      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.payload);
      expect(body.error.message).toMatch(/Invalid or expired password reset token/i);
    });

    it('rejects expired password reset tokens', async () => {
      const rawResetToken = generateOpaqueToken();
      const tokenHash = hashToken(rawResetToken);

      // Store an expired reset token in the database
      await db.insert(passwordResetTokens).values({
        userId: testUserId,
        tokenHash,
        expiresAt: new Date(Date.now() - 60000), // Expired 1 min ago
        usedAt: null,
      });

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/reset-password',
        payload: {
          token: rawResetToken,
          newPassword: 'BrandNewSecurePassword123!',
        },
      });

      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.payload);
      expect(body.error.message).toMatch(/Invalid or expired password reset token/i);
    });
  });

  // =========================================================================
  // 3. Provider State Security
  // =========================================================================
  describe('Provider State & SSO Transaction Protection', () => {
    it('rejects sso/start when Identity Provider is disabled with 400', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/sso/start',
        payload: {
          providerId: disabledIdpId,
        },
      });

      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.payload);
      expect(body.error.message).toMatch(/disabled/i);
    });

    it('rejects sso/callback when Identity Provider has been disabled', async () => {
      const state = generateOpaqueToken();

      // Insert transaction tied to disabled IdP
      await db.insert(ssoTransactions).values({
        organizationId: testOrgId,
        identityProviderId: disabledIdpId,
        state,
        nonce: generateOpaqueToken(),
        codeVerifier: generateOpaqueToken(),
        redirectUri: 'http://localhost:3000/api/v1/auth/sso/callback',
        status: 'pending',
        expiresAt: new Date(Date.now() + 60000),
      });

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/sso/callback',
        query: {
          code: 'test-code',
          state,
        },
      });

      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.payload);
      expect(body.error.message).toMatch(/not active/i);
    });
  });

  // =========================================================================
  // 4. Cryptographic OIDC ID Token Validation
  // =========================================================================
  describe('OIDC Cryptographic Validation (JWT / JWKS / Claims)', () => {
    const expectedIssuer = 'https://login.example.com';
    const expectedAudience = 'client-id-xyz';
    const expectedNonce = 'cryptographic-nonce-12345';
    const jwksUri = 'https://login.example.com/discovery/v2.0/keys';

    beforeAll(() => {
      // Mock JWKS resolver to return our realPublicKey
      vi.spyOn(oidcStrategy, 'getJWKS').mockReturnValue(async () => realPublicKey);
    });

    afterAll(() => {
      vi.restoreAllMocks();
    });

    it('successfully verifies a valid signed ID token with correct claims', async () => {
      const validToken = await new SignJWT({
        sub: 'ext-user-999',
        email: 'alice@security.com',
        given_name: 'Alice',
        family_name: 'Tester',
        nonce: expectedNonce,
        email_verified: true,
      })
        .setProtectedHeader({ alg: 'RS256' })
        .setIssuedAt()
        .setIssuer(expectedIssuer)
        .setAudience(expectedAudience)
        .setExpirationTime('10m')
        .sign(realPrivateKey);

      const profile = await oidcStrategy.verifyIdToken({
        idToken: validToken,
        jwksUri,
        expectedIssuer,
        expectedAudience,
        expectedNonce,
      });

      expect(profile.externalSubjectId).toBe('ext-user-999');
      expect(profile.email).toBe('alice@security.com');
      expect(profile.firstName).toBe('Alice');
      expect(profile.lastName).toBe('Tester');
      expect(profile.emailVerified).toBe(true);
    });

    it('rejects an ID token signed with an invalid/foreign private key (JWS verification failed)', async () => {
      // Token signed with foreign key, but JWKS only trusts realPublicKey
      const forgedToken = await new SignJWT({
        sub: 'ext-user-attacker',
        email: 'attacker@evil.com',
        nonce: expectedNonce,
      })
        .setProtectedHeader({ alg: 'RS256' })
        .setIssuedAt()
        .setIssuer(expectedIssuer)
        .setAudience(expectedAudience)
        .setExpirationTime('10m')
        .sign(foreignPrivateKey);

      await expect(
        oidcStrategy.verifyIdToken({
          idToken: forgedToken,
          jwksUri,
          expectedIssuer,
          expectedAudience,
          expectedNonce,
        })
      ).rejects.toThrow();
    });

    it('rejects an ID token with the wrong issuer', async () => {
      const wrongIssuerToken = await new SignJWT({
        sub: 'ext-user-1',
        email: 'user@example.com',
        nonce: expectedNonce,
      })
        .setProtectedHeader({ alg: 'RS256' })
        .setIssuedAt()
        .setIssuer('https://malicious-untrusted-issuer.com')
        .setAudience(expectedAudience)
        .setExpirationTime('10m')
        .sign(realPrivateKey);

      await expect(
        oidcStrategy.verifyIdToken({
          idToken: wrongIssuerToken,
          jwksUri,
          expectedIssuer,
          expectedAudience,
          expectedNonce,
        })
      ).rejects.toThrow();
    });

    it('rejects an ID token with the wrong audience', async () => {
      const wrongAudienceToken = await new SignJWT({
        sub: 'ext-user-1',
        email: 'user@example.com',
        nonce: expectedNonce,
      })
        .setProtectedHeader({ alg: 'RS256' })
        .setIssuedAt()
        .setIssuer(expectedIssuer)
        .setAudience('some-other-app-client-id')
        .setExpirationTime('10m')
        .sign(realPrivateKey);

      await expect(
        oidcStrategy.verifyIdToken({
          idToken: wrongAudienceToken,
          jwksUri,
          expectedIssuer,
          expectedAudience,
          expectedNonce,
        })
      ).rejects.toThrow();
    });

    it('rejects an expired ID token', async () => {
      const expiredToken = await new SignJWT({
        sub: 'ext-user-1',
        email: 'user@example.com',
        nonce: expectedNonce,
      })
        .setProtectedHeader({ alg: 'RS256' })
        .setIssuedAt(Math.floor(Date.now() / 1000) - 1000)
        .setIssuer(expectedIssuer)
        .setAudience(expectedAudience)
        .setExpirationTime(Math.floor(Date.now() / 1000) - 200) // Expired in past beyond 60s clock drift
        .sign(realPrivateKey);

      await expect(
        oidcStrategy.verifyIdToken({
          idToken: expiredToken,
          jwksUri,
          expectedIssuer,
          expectedAudience,
          expectedNonce,
        })
      ).rejects.toThrow();
    });

    it('rejects an ID token when the nonce does not match the transaction nonce', async () => {
      const mismatchedNonceToken = await new SignJWT({
        sub: 'ext-user-1',
        email: 'user@example.com',
        nonce: 'attacker-tampered-nonce-999',
      })
        .setProtectedHeader({ alg: 'RS256' })
        .setIssuedAt()
        .setIssuer(expectedIssuer)
        .setAudience(expectedAudience)
        .setExpirationTime('10m')
        .sign(realPrivateKey);

      await expect(
        oidcStrategy.verifyIdToken({
          idToken: mismatchedNonceToken,
          jwksUri,
          expectedIssuer,
          expectedAudience,
          expectedNonce: 'original-cryptographic-nonce-expected',
        })
      ).rejects.toThrow(/nonce verification failed: nonce mismatch/i);
    });
  });

  // =========================================================================
  // 5. CSRF Protection
  // =========================================================================
  describe('CSRF Protection Verification', () => {
    it('GET /api/v1/auth/csrf generates and sets valid _csrf cookie and token', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/csrf',
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.success).toBe(true);
      expect(typeof body.data.csrfToken).toBe('string');
      expect(body.data.csrfToken.length).toBeGreaterThan(10);

      // Verify cookie is set
      const cookies = res.cookies;
      expect(cookies.some((c) => c.name === '_csrf')).toBe(true);
    });
  });
});
