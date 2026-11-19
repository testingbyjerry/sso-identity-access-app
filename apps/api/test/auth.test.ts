import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { FastifyInstance } from 'fastify';
import {
  closeDatabase,
  getDatabase,
  identityProviders,
  memberRoles,
  organizationMembers,
  organizations,
  passwordResetTokens,
  roles,
  ssoTransactions,
  users,
  withSystemTransaction,
} from '@sso/database';
import { generateKeyPair, SignJWT } from 'jose';
import { and, eq } from 'drizzle-orm';
import { buildApp } from '../src/app.js';
import { decryptSecret, hashPassword, hashToken } from '../src/common/crypto.js';
import { EntraStrategy, entraStrategy } from '../src/modules/auth/strategies/entra.strategy.js';
import { OktaStrategy, oktaStrategy } from '../src/modules/auth/strategies/okta.strategy.js';

describe('Phase 3 — Authentication, Authorization & Enterprise SSO Tests', () => {
  let app: FastifyInstance;
  const db = getDatabase();

  // Test data IDs
  let orgAId: string;
  let orgBId: string;
  let orgCId: string; // User is NOT a member of Org C
  let testDomain: string;
  let testUserId: string;
  let testUserEmail: string;
  const testPassword = 'Password123!Secure';
  let testPasswordHash: string;

  let suspendedUserId: string;
  let ssoProviderId: string;

  // Mock RSA keypair for OIDC token verification testing
  let mockPublicKey: Awaited<ReturnType<typeof generateKeyPair>>['publicKey'];
  let mockPrivateKey: Awaited<ReturnType<typeof generateKeyPair>>['privateKey'];

  beforeAll(async () => {
    app = await buildApp({ logger: false });
    await app.ready();

    const timestamp = Date.now();
    testDomain = `orga-${timestamp}.com`;

    // 1. Generate RSA keypair for mock OIDC testing
    const kp = await generateKeyPair('RS256');
    mockPublicKey = kp.publicKey;
    mockPrivateKey = kp.privateKey;

    // 2. Hash test password with Argon2id
    testPasswordHash = await hashPassword(testPassword);
    testUserEmail = `auth-tester-${timestamp}@example.com`;

    // 3. Seed organizations, roles, and test users in PostgreSQL
    await withSystemTransaction(async (tx) => {
      // Organization A
      const [orgA] = await tx
        .insert(organizations)
        .values({
          name: 'Auth Test Org A',
          slug: `auth-org-a-${timestamp}`,
          domain: testDomain,
          status: 'active',
        })
        .returning();
      orgAId = orgA!.id;

      // Organization B
      const [orgB] = await tx
        .insert(organizations)
        .values({
          name: 'Auth Test Org B',
          slug: `auth-org-b-${timestamp}`,
          domain: `orgb-${timestamp}.com`,
          status: 'active',
        })
        .returning();
      orgBId = orgB!.id;

      // Organization C (Non-member org)
      const [orgC] = await tx
        .insert(organizations)
        .values({
          name: 'Auth Test Org C',
          slug: `auth-org-c-${timestamp}`,
          domain: `orgc-${timestamp}.com`,
          status: 'active',
        })
        .returning();
      orgCId = orgC!.id;

      // Roles for Org A
      const [adminRoleA] = await tx
        .insert(roles)
        .values({
          organizationId: orgAId,
          name: 'admin',
          isSystem: true,
        })
        .returning();

      // Active User
      const [user] = await tx
        .insert(users)
        .values({
          email: testUserEmail,
          passwordHash: testPasswordHash,
          firstName: 'Alice',
          lastName: 'Tester',
          status: 'active',
        })
        .returning();
      testUserId = user!.id;

      // Suspended User
      const [suspUser] = await tx
        .insert(users)
        .values({
          email: `suspended-${Date.now()}@example.com`,
          passwordHash: testPasswordHash,
          status: 'suspended',
        })
        .returning();
      suspendedUserId = suspUser!.id;

      // Memberships for active user: Member in Org A and Org B
      const [memberA] = await tx
        .insert(organizationMembers)
        .values({
          organizationId: orgAId,
          userId: testUserId,
          status: 'active',
        })
        .returning();

      await tx.insert(memberRoles).values({
        organizationId: orgAId,
        memberId: memberA!.id,
        roleId: adminRoleA!.id,
      });

      await tx.insert(organizationMembers).values({
        organizationId: orgBId,
        userId: testUserId,
        status: 'active',
      });
    });
  });

  afterAll(async () => {
    if (app) await app.close();
    await closeDatabase();
  });

  // ==============================================================================
  // 1. Email/Password Authentication & Argon2id Verification
  // ==============================================================================
  describe('Email/Password Authentication', () => {
    it('successfully logs in with valid credentials, returns user profile and sets HttpOnly session cookie', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: testUserEmail,
          password: testPassword,
          organizationId: orgAId,
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.success).toBe(true);
      expect(body.data.user.email).toBe(testUserEmail);
      expect(body.data.activeOrganizationId).toBe(orgAId);
      expect(body.data.session).toBeDefined();

      // Verify Set-Cookie header contains HttpOnly sso_session
      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      const cookieStr = Array.isArray(cookies) ? cookies.join('; ') : String(cookies);
      expect(cookieStr).toContain('sso_session=');
      expect(cookieStr.toLowerCase()).toContain('httponly');
      expect(cookieStr.toLowerCase()).toContain('samesite=lax');
    });

    it('rejects login with wrong password using generic error message', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: testUserEmail,
          password: 'IncorrectPassword999!',
        },
      });

      expect(res.statusCode).toBe(401);
      const body = JSON.parse(res.payload);
      expect(body.success).toBe(false);
      expect(body.error.message).toBe('Invalid email or password');
    });

    it('rejects login for non-existent email with identical generic error message (prevents enumeration)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: 'nonexistent-user-xyz@example.com',
          password: testPassword,
        },
      });

      expect(res.statusCode).toBe(401);
      const body = JSON.parse(res.payload);
      expect(body.success).toBe(false);
      expect(body.error.message).toBe('Invalid email or password');
    });

    it('rejects login for suspended account with 403 Forbidden', async () => {
      const [suspUser] = await db.select().from(users).where(eq(users.id, suspendedUserId));

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: suspUser!.email,
          password: testPassword,
        },
      });

      expect(res.statusCode).toBe(403);
      const body = JSON.parse(res.payload);
      expect(body.success).toBe(false);
      expect(body.error.message).toContain('suspended');
    });
  });

  // ==============================================================================
  // 2. Session Lifecycle, Current User & Logout
  // ==============================================================================
  describe('Session Lifecycle & Current User Endpoint', () => {
    let sessionCookie: string;
    let rawSessionToken: string;

    beforeAll(async () => {
      // Login to obtain fresh session
      const loginRes = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: testUserEmail,
          password: testPassword,
          organizationId: orgAId,
        },
      });

      const setCookie = loginRes.headers['set-cookie'];
      const rawCookie = Array.isArray(setCookie) ? setCookie[0] : String(setCookie || '');
      sessionCookie = (rawCookie || '').split(';')[0] || '';
      rawSessionToken = sessionCookie.replace('sso_session=', '');
    });

    it('GET /api/v1/auth/me resolves authenticated profile via HttpOnly cookie', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/me',
        headers: {
          cookie: sessionCookie,
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.success).toBe(true);
      expect(body.data.id).toBe(testUserId);
      expect(body.data.email).toBe(testUserEmail);
      expect(body.data.activeOrganizationId).toBe(orgAId);
      expect(body.data.organizations).toHaveLength(2); // Org A and Org B
    });

    it('GET /api/v1/auth/me resolves authenticated profile via Bearer authorization header', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/me',
        headers: {
          authorization: `Bearer ${rawSessionToken}`,
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.success).toBe(true);
      expect(body.data.email).toBe(testUserEmail);
    });

    it('rejects unauthenticated requests to /api/v1/auth/me with 401', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/me',
      });

      expect(res.statusCode).toBe(401);
    });

    it('GET /api/v1/sessions lists active user sessions', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/sessions',
        headers: {
          cookie: sessionCookie,
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data.length).toBeGreaterThan(0);
    });

    it('POST /api/v1/auth/logout terminates session and clears cookie', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/logout',
        headers: {
          cookie: sessionCookie,
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.data.loggedOut).toBe(true);

      // Verify cookie was cleared (Max-Age=0 or expired)
      const clearedCookie = res.headers['set-cookie'];
      expect(String(clearedCookie).toLowerCase()).toContain('sso_session=;');

      // Verifying subsequent request with the logged-out session fails
      const checkRes = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/me',
        headers: {
          cookie: sessionCookie,
        },
      });
      expect(checkRes.statusCode).toBe(401);
    });
  });

  // ==============================================================================
  // 3. Organization Switching & Tenant Validation
  // ==============================================================================
  describe('Organization Switching & Membership Validation', () => {
    let sessionCookie: string;

    beforeAll(async () => {
      const loginRes = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: testUserEmail,
          password: testPassword,
          organizationId: orgAId,
        },
      });
      const setCookie = loginRes.headers['set-cookie'];
      const rawCookie = Array.isArray(setCookie) ? setCookie[0] : String(setCookie || '');
      sessionCookie = (rawCookie || '').split(';')[0] || '';
    });

    it('allows user to switch active organization to Org B and rotates session token', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/switch-organization',
        headers: {
          cookie: sessionCookie,
        },
        payload: {
          organizationId: orgBId,
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.success).toBe(true);
      expect(body.data.session.activeOrganizationId).toBe(orgBId);

      // Verify new rotated cookie was emitted
      const newCookies = res.headers['set-cookie'];
      expect(newCookies).toBeDefined();
      const rawNew = Array.isArray(newCookies) ? newCookies[0] : String(newCookies || '');
      const newSessionCookie = (rawNew || '').split(';')[0] || '';
      expect(newSessionCookie).not.toBe(sessionCookie); // Token rotated!

      // Check /api/v1/auth/me confirms Org B is active
      const meRes = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/me',
        headers: {
          cookie: newSessionCookie,
        },
      });
      expect(meRes.statusCode).toBe(200);
      expect(JSON.parse(meRes.payload).data.activeOrganizationId).toBe(orgBId);

      // Update session cookie for subsequent tests
      sessionCookie = newSessionCookie;
    });

    it('denies switching to Org C where user is NOT an active member with 403 INVALID_TENANT', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/switch-organization',
        headers: {
          cookie: sessionCookie,
        },
        payload: {
          organizationId: orgCId,
        },
      });

      expect(res.statusCode).toBe(403);
      const body = JSON.parse(res.payload);
      expect(body.error.code).toBe('INVALID_TENANT');
    });
  });

  // ==============================================================================
  // 4. Password Recovery & Single-Use Hashed Tokens
  // ==============================================================================
  describe('Password Recovery Workflow', () => {
    let resetToken: string;

    it('forgot-password returns generic message for existing email and stores hashed token in DB', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/forgot-password',
        payload: {
          email: testUserEmail,
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.data.message).toContain('If an account exists');
      expect(body.data.resetToken).toBeDefined(); // Returned in test mode for testing

      resetToken = body.data.resetToken;

      // Verify database stored token hash, NOT plaintext token!
      const expectedHash = hashToken(resetToken);
      const [tokenRow] = await db
        .select()
        .from(passwordResetTokens)
        .where(eq(passwordResetTokens.tokenHash, expectedHash));

      expect(tokenRow).toBeDefined();
      expect(tokenRow!.userId).toBe(testUserId);
      expect(tokenRow!.usedAt).toBeNull();
    });

    it('forgot-password returns identical generic message for non-existent email (no enumeration)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/forgot-password',
        payload: {
          email: 'unknown-random-person@example.com',
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.data.message).toContain('If an account exists');
      expect(body.data.resetToken).toBeUndefined();
    });

    it('reset-password updates password with Argon2id, invalidates sessions, and marks token used', async () => {
      const newPassword = 'NewSuperPassword123!';

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/reset-password',
        payload: {
          token: resetToken,
          newPassword,
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.data.message).toContain('successfully reset');

      // Verify token is marked used in DB
      const expectedHash = hashToken(resetToken);
      const [tokenRow] = await db
        .select()
        .from(passwordResetTokens)
        .where(eq(passwordResetTokens.tokenHash, expectedHash));
      expect(tokenRow!.usedAt).not.toBeNull();

      // Verify old password no longer works
      const oldLoginRes = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: testUserEmail,
          password: testPassword,
        },
      });
      expect(oldLoginRes.statusCode).toBe(401);

      // Verify new password works
      const newLoginRes = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: testUserEmail,
          password: newPassword,
        },
      });
      expect(newLoginRes.statusCode).toBe(200);
    });

    it('rejects reuse of already used password reset token with 400 Bad Request', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/reset-password',
        payload: {
          token: resetToken,
          newPassword: 'AnotherPassword123!',
        },
      });

      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.payload);
      expect(body.error.message).toContain('Invalid or expired');
    });
  });

  // ==============================================================================
  // 5. Anti-CSRF Protection
  // ==============================================================================
  describe('Anti-CSRF Protection', () => {
    it('provides CSRF token via GET /api/v1/auth/csrf', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/csrf',
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.success).toBe(true);
      expect(body.data.csrfToken).toBeDefined();
    });
  });

  // ==============================================================================
  // 6. Identity Provider Secret Encryption & Redaction
  // ==============================================================================
  describe('Identity Provider Secret Encryption at Rest', () => {
    const rawSecret = 'super-secret-azure-client-secret-999';

    it('encrypts provider client secret at rest with AES-256-GCM and redacts it from API responses', async () => {
      const createRes = await app.inject({
        method: 'POST',
        url: '/api/v1/identity-providers',
        headers: {
          'x-user-id': testUserId,
          'x-organization-id': orgAId,
        },
        payload: {
          type: 'microsoft',
          name: 'Acme Entra ID',
          slug: `acme-entra-${Date.now()}`,
          enabled: true,
          domains: ['acme.com', testDomain],
          config: {
            clientId: 'mock-entra-client-id-1234',
            clientSecret: rawSecret,
            tenantId: 'mock-tenant-id-1234',
            scopes: ['openid', 'profile', 'email'],
          },
        },
      });

      expect(createRes.statusCode).toBe(201);
      const createBody = JSON.parse(createRes.payload);
      ssoProviderId = createBody.data.id;

      // Check API response redacts clientSecret
      expect(createBody.data.config.clientSecret).toBe('********');

      // Verify raw database record: stored as AES-256-GCM ciphertext
      const [dbRow] = await db
        .select()
        .from(identityProviders)
        .where(eq(identityProviders.id, ssoProviderId));

      const storedConfig = dbRow!.config as Record<string, string>;
      expect(storedConfig.clientSecret).not.toBe(rawSecret);
      expect(storedConfig.clientSecret).toContain(':'); // iv:tag:ciphertext

      // Verify decryption recovers original secret exactly
      const decrypted = decryptSecret(storedConfig.clientSecret || '');
      expect(decrypted).toBe(rawSecret);

      // Verify GET /api/v1/identity-providers/:id also redacts
      const getRes = await app.inject({
        method: 'GET',
        url: `/api/v1/identity-providers/${ssoProviderId}`,
        headers: {
          'x-user-id': testUserId,
          'x-organization-id': orgAId,
        },
      });
      expect(getRes.statusCode).toBe(200);
      const getBody = JSON.parse(getRes.payload);
      expect(getBody.data.config.clientSecret).toBe('********');
    });
  });

  // ==============================================================================
  // 7. Enterprise SSO, PKCE, State/Nonce & Replay Prevention
  // ==============================================================================
  describe('Enterprise SSO (OIDC / PKCE / Callback / Replay Prevention)', () => {
    let generatedState: string;

    it('discovers enabled identity provider by domain (GET /api/v1/auth/sso/discover)', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/auth/sso/discover?query=alice@${testDomain}`,
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.success).toBe(true);
      expect(body.data.id).toBe(ssoProviderId);
      expect(body.data.type).toBe('microsoft');
    });

    it('initiates SSO with PKCE S256 challenge, state, and nonce (POST /api/v1/auth/sso/start)', async () => {
      // Mock entraStrategy.discover to return mock endpoints
      vi.spyOn(entraStrategy, 'discover').mockResolvedValue({
        issuer: 'https://login.microsoftonline.com/mock-tenant-id-1234/v2.0',
        authorization_endpoint: 'https://login.microsoftonline.com/mock-tenant-id-1234/oauth2/v2.0/authorize',
        token_endpoint: 'https://login.microsoftonline.com/mock-tenant-id-1234/oauth2/v2.0/token',
        jwks_uri: 'https://login.microsoftonline.com/mock-tenant-id-1234/discovery/v2.0/keys',
      });

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/sso/start',
        payload: {
          providerId: ssoProviderId,
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.success).toBe(true);
      expect(body.data.authorizationUrl).toBeDefined();
      expect(body.data.state).toBeDefined();

      generatedState = body.data.state;

      // Verify authorization URL contains PKCE and standard OIDC query params
      const parsedUrl = new URL(body.data.authorizationUrl);
      expect(parsedUrl.searchParams.get('response_type')).toBe('code');
      expect(parsedUrl.searchParams.get('client_id')).toBe('mock-entra-client-id-1234');
      expect(parsedUrl.searchParams.get('code_challenge_method')).toBe('S256');
      expect(parsedUrl.searchParams.get('code_challenge')).toBeDefined();
      expect(parsedUrl.searchParams.get('state')).toBe(generatedState);
      expect(parsedUrl.searchParams.get('nonce')).toBeDefined();

      // Verify transaction saved in PostgreSQL in 'pending' status
      const [tx] = await db
        .select()
        .from(ssoTransactions)
        .where(eq(ssoTransactions.state, generatedState));

      expect(tx).toBeDefined();
      expect(tx!.status).toBe('pending');
      expect(tx!.codeVerifier).toBeDefined();
      expect(tx!.nonce).toBeDefined();
    });

    it('completes SSO callback with JWKS verification, JIT user provisioning, and sets session cookie', async () => {
      // 1. Fetch transaction to get expected nonce
      const [tx] = await db
        .select()
        .from(ssoTransactions)
        .where(eq(ssoTransactions.state, generatedState));

      // 2. Generate cryptographically signed mock ID token with nonce
      const ssoUserEmail = `sso-jit-user-${Date.now()}@acme.com`;
      const idToken = await new SignJWT({
        oid: 'azure-oid-987654321',
        preferred_username: ssoUserEmail,
        name: 'JIT SSO User',
        nonce: tx!.nonce,
      })
        .setProtectedHeader({ alg: 'RS256', kid: 'mock-key-1' })
        .setIssuer('https://login.microsoftonline.com/mock-tenant-id-1234/v2.0')
        .setAudience('mock-entra-client-id-1234')
        .setExpirationTime('1h')
        .sign(mockPrivateKey);

      // Mock exchangeCode & JWKS verification in entraStrategy
      vi.spyOn(entraStrategy, 'exchangeCode').mockResolvedValue({
        id_token: idToken,
        access_token: 'mock-access-token',
        token_type: 'Bearer',
      });

      vi.spyOn(entraStrategy, 'getJWKS').mockReturnValue(async () => mockPublicKey);

      // 3. Invoke SSO callback
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/auth/sso/callback?code=mock-auth-code-12345&state=${generatedState}`,
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.success).toBe(true);
      expect(body.data.user.email).toBe(ssoUserEmail);
      expect(body.data.activeOrganizationId).toBe(orgAId);

      // Verify session cookie set
      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(String(cookies)).toContain('sso_session=');

      // Verify transaction status changed to 'completed'
      const [updatedTx] = await db
        .select()
        .from(ssoTransactions)
        .where(eq(ssoTransactions.state, generatedState));
      expect(updatedTx!.status).toBe('completed');

      // Verify user was JIT provisioned in users and organizationMembers
      const [jitUser] = await db.select().from(users).where(eq(users.email, ssoUserEmail));
      expect(jitUser).toBeDefined();
      expect(jitUser!.emailVerifiedAt).not.toBeNull();

      const [jitMember] = await db
        .select()
        .from(organizationMembers)
        .where(
          and(
            eq(organizationMembers.organizationId, orgAId),
            eq(organizationMembers.userId, jitUser!.id)
          )
        );
      expect(jitMember).toBeDefined();
    });

    it('rejects replay of already completed SSO state (replay attack prevention)', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/auth/sso/callback?code=mock-auth-code-12345&state=${generatedState}`,
      });

      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.payload);
      expect(body.error.message).toContain('replay prevented');
    });

    it('rejects SSO callback with invalid or unknown state parameter with 400', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/sso/callback?code=mock-code&state=nonexistent-state-1234',
      });

      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.payload);
      expect(body.error.message).toContain('Invalid or expired SSO state');
    });
  });

  // ==============================================================================
  // 8. Microsoft Entra ID and Okta Adapter Claim Mapping Tests
  // ==============================================================================
  describe('Provider Adapters (Entra ID & Okta)', () => {
    it('EntraStrategy correctly resolves issuer URL and maps claims (oid, preferred_username, upn)', () => {
      const issuer = EntraStrategy.getIssuerUrl('tenant-abc-123');
      expect(issuer).toBe('https://login.microsoftonline.com/tenant-abc-123/v2.0');

      const claims = {
        oid: 'entra-oid-1111',
        preferred_username: 'alice@entra-corp.com',
        name: 'Alice Johnson',
      };

      const profile = entraStrategy.mapClaimsToProfile(claims);
      expect(profile.externalSubjectId).toBe('entra-oid-1111');
      expect(profile.email).toBe('alice@entra-corp.com');
      expect(profile.firstName).toBe('Alice');
      expect(profile.lastName).toBe('Johnson');
      expect(profile.emailVerified).toBe(true);
    });

    it('OktaStrategy correctly resolves issuer URL and maps claims (sub, email)', () => {
      const issuer = OktaStrategy.getIssuerUrl('dev-12345.okta.com', 'default');
      expect(issuer).toBe('https://dev-12345.okta.com/oauth2/default');

      const claims = {
        sub: 'okta-sub-2222',
        email: 'bob@okta-corp.com',
        given_name: 'Robert',
        family_name: 'Smith',
        email_verified: true,
      };

      const profile = oktaStrategy.mapClaimsToProfile(claims);
      expect(profile.externalSubjectId).toBe('okta-sub-2222');
      expect(profile.email).toBe('bob@okta-corp.com');
      expect(profile.firstName).toBe('Robert');
      expect(profile.lastName).toBe('Smith');
      expect(profile.emailVerified).toBe(true);
    });
  });
});
