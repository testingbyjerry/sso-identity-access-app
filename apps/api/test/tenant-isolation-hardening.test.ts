import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { FastifyInstance } from 'fastify';
import {
  closeDatabase,
  getDatabase,
  identityProviders,
  memberRoles,
  organizationMembers,
  organizations,
  roles,
  users,
  withSystemTransaction,
} from '@sso/database';
import { eq } from 'drizzle-orm';
import { buildApp } from '../src/app.js';
import { hashPassword } from '../src/common/crypto.js';

describe('Phase 5 — Tenant Isolation & Authorization Hardening Integration Tests', () => {
  let app: FastifyInstance;
  const db = getDatabase();

  let orgAId: string;
  let orgBId: string;

  let userAId: string;
  let userBId: string;

  let sessionCookieA: string;

  let memberAId: string;
  let memberBId: string;

  let roleAId: string;
  let roleBId: string;

  let idpAId: string;
  let idpBId: string;

  beforeAll(async () => {
    app = await buildApp({ logger: false });
    await app.ready();

    const timestamp = Date.now();
    const testPassword = 'SecurePassword123!';
    const passwordHash = await hashPassword(testPassword);

    await withSystemTransaction(async (tx) => {
      // Create Organization A
      const [orgA] = await tx
        .insert(organizations)
        .values({
          name: 'Tenant Alpha Corp',
          slug: `tenant-alpha-${timestamp}`,
          domain: `alpha-${timestamp}.com`,
          status: 'active',
        })
        .returning();
      orgAId = orgA!.id;

      // Create Organization B
      const [orgB] = await tx
        .insert(organizations)
        .values({
          name: 'Tenant Beta Corp',
          slug: `tenant-beta-${timestamp}`,
          domain: `beta-${timestamp}.com`,
          status: 'active',
        })
        .returning();
      orgBId = orgB!.id;

      // Create User A (Member of Org A only)
      const [uA] = await tx
        .insert(users)
        .values({
          email: `alice-tenant-a-${timestamp}@example.com`,
          passwordHash,
          status: 'active',
        })
        .returning();
      userAId = uA!.id;

      // Create User B (Member of Org B only)
      const [uB] = await tx
        .insert(users)
        .values({
          email: `bob-tenant-b-${timestamp}@example.com`,
          passwordHash,
          status: 'active',
        })
        .returning();
      userBId = uB!.id;

      // Roles
      const [rA] = await tx
        .insert(roles)
        .values({
          organizationId: orgAId,
          name: 'Alpha Admin',
        })
        .returning();
      roleAId = rA!.id;

      const [rB] = await tx
        .insert(roles)
        .values({
          organizationId: orgBId,
          name: 'Beta Admin',
        })
        .returning();
      roleBId = rB!.id;

      // Memberships
      const [mA] = await tx
        .insert(organizationMembers)
        .values({
          organizationId: orgAId,
          userId: userAId,
          status: 'active',
        })
        .returning();
      memberAId = mA!.id;

      const [mB] = await tx
        .insert(organizationMembers)
        .values({
          organizationId: orgBId,
          userId: userBId,
          status: 'active',
        })
        .returning();
      memberBId = mB!.id;

      // Assign roles
      await tx.insert(memberRoles).values({
        organizationId: orgAId,
        memberId: memberAId,
        roleId: roleAId,
      });

      await tx.insert(memberRoles).values({
        organizationId: orgBId,
        memberId: memberBId,
        roleId: roleBId,
      });

      // Identity Providers
      const [idpA] = await tx
        .insert(identityProviders)
        .values({
          organizationId: orgAId,
          type: 'oidc',
          name: 'Alpha Corporate IdP',
          slug: `alpha-idp-${timestamp}`,
          enabled: true,
          domains: [`alpha-${timestamp}.com`],
          config: { clientId: 'alpha-client', issuer: 'https://alpha.auth.com' },
        })
        .returning();
      idpAId = idpA!.id;

      const [idpB] = await tx
        .insert(identityProviders)
        .values({
          organizationId: orgBId,
          type: 'oidc',
          name: 'Beta Corporate IdP',
          slug: `beta-idp-${timestamp}`,
          enabled: true,
          domains: [`beta-${timestamp}.com`],
          config: { clientId: 'beta-client', issuer: 'https://beta.auth.com' },
        })
        .returning();
      idpBId = idpB!.id;
    });

    // Authenticate User A to get session cookie for Org A
    const loginResA = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        email: `alice-tenant-a-${timestamp}@example.com`,
        password: testPassword,
        organizationId: orgAId,
      },
    });
    expect(loginResA.statusCode).toBe(200);
    const rawCookieA = loginResA.cookies.find((c) => c.name === 'sso_session')?.value || '';
    sessionCookieA = rawCookieA;

    // Authenticate User B to get session cookie for Org B
    const loginResB = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        email: `bob-tenant-b-${timestamp}@example.com`,
        password: testPassword,
        organizationId: orgBId,
      },
    });
    expect(loginResB.statusCode).toBe(200);
    expect(loginResB.cookies.some((c) => c.name === 'sso_session')).toBe(true);
  });

  afterAll(async () => {
    await app.close();
    await closeDatabase();
  });

  // =========================================================================
  // 1. Cross-Tenant Read Isolation
  // =========================================================================
  describe('Cross-Tenant Read Isolation', () => {
    it('Organization A cannot read Organization B members', async () => {
      // User A requests member list
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/members',
        cookies: { sso_session: sessionCookieA },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      const memberIds = body.data.map((m: { id: string }) => m.id);

      // Must contain Member A, must NEVER contain Member B
      expect(memberIds).toContain(memberAId);
      expect(memberIds).not.toContain(memberBId);
    });

    it('Organization A cannot read Organization B identity providers', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/identity-providers',
        cookies: { sso_session: sessionCookieA },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      const idpIds = body.data.map((idp: { id: string }) => idp.id);

      expect(idpIds).toContain(idpAId);
      expect(idpIds).not.toContain(idpBId);
    });

    it('Organization A cannot read Organization B roles', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/roles',
        cookies: { sso_session: sessionCookieA },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      const roleIds = body.data.map((r: { id: string }) => r.id);

      expect(roleIds).toContain(roleAId);
      expect(roleIds).not.toContain(roleBId);
    });

    it('Organization A user cannot access Organization B direct URL by ID', async () => {
      // User A attempts to directly fetch IdP of Org B
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/identity-providers/${idpBId}`,
        cookies: { sso_session: sessionCookieA },
      });

      // Must be 404 Not Found (Row-level security / tenant-scoped query)
      expect(res.statusCode).toBe(404);
    });
  });

  // =========================================================================
  // 2. Cross-Tenant Write & Mutation Isolation (Update / Delete)
  // =========================================================================
  describe('Cross-Tenant Write & Mutation Isolation', () => {
    it('Organization A cannot update Organization B identity provider', async () => {
      // User A attempts to tamper with Org B's IdP
      const res = await app.inject({
        method: 'PATCH',
        url: `/api/v1/identity-providers/${idpBId}`,
        cookies: { sso_session: sessionCookieA },
        payload: {
          name: 'Tampered IdP Name by Attacker',
        },
      });

      // Must be 404 Not Found due to tenant isolation
      expect(res.statusCode).toBe(404);

      // Verify in DB that Org B's IdP was untouched
      const [idpB] = await db.select().from(identityProviders).where(eq(identityProviders.id, idpBId));
      expect(idpB?.name).toBe('Beta Corporate IdP');
    });

    it('Organization A cannot delete Organization B identity provider', async () => {
      // User A attempts to delete Org B's IdP
      const res = await app.inject({
        method: 'DELETE',
        url: `/api/v1/identity-providers/${idpBId}`,
        cookies: { sso_session: sessionCookieA },
      });

      expect(res.statusCode).toBe(404);

      // Verify IdP still exists
      const [idpB] = await db.select().from(identityProviders).where(eq(identityProviders.id, idpBId));
      expect(idpB).toBeDefined();
    });

    it('Organization A cannot remove or update Organization B members', async () => {
      // User A attempts to remove Member B
      const res = await app.inject({
        method: 'DELETE',
        url: `/api/v1/members/${memberBId}`,
        cookies: { sso_session: sessionCookieA },
      });

      expect(res.statusCode).toBe(404);

      // Verify Member B is still active
      const [mB] = await db.select().from(organizationMembers).where(eq(organizationMembers.id, memberBId));
      expect(mB?.status).toBe('active');
    });
  });

  // =========================================================================
  // 3. Unauthorized Cross-Tenant Role Assignment Prevention
  // =========================================================================
  describe('Role Assignment Authorization & Composite Integrity', () => {
    it('rejects assigning a foreign organization role to a local member', async () => {
      // Attempt to assign roleBId to memberAId
      const res = await app.inject({
        method: 'PATCH',
        url: `/api/v1/members/${memberAId}`,
        cookies: { sso_session: sessionCookieA },
        payload: {
          roleIds: [roleBId], // Belongs to Org B!
        },
      });

      // Must fail (either 400 Bad Request or foreign key violation)
      expect(res.statusCode).toBeGreaterThanOrEqual(400);

      // Verify role was NOT assigned
      const assignments = await db
        .select()
        .from(memberRoles)
        .where(eq(memberRoles.memberId, memberAId));
      const assignedRoleIds = assignments.map((a) => a.roleId);
      expect(assignedRoleIds).not.toContain(roleBId);
    });
  });

  // =========================================================================
  // 4. Organization Switching Security Revalidation
  // =========================================================================
  describe('Organization Switching Revalidation', () => {
    it('denies switching organization to an organization where user is not an active member', async () => {
      // User A attempts to switch to Org B (where they have zero membership)
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/switch-organization',
        cookies: { sso_session: sessionCookieA },
        payload: {
          organizationId: orgBId,
        },
      });

      expect(res.statusCode).toBe(403);
      const body = JSON.parse(res.payload);
      expect(body.error.code).toBe('INVALID_TENANT');
    });
  });
});
