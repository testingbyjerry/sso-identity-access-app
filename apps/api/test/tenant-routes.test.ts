import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { FastifyInstance } from 'fastify';
import { closeDatabase, users, withSystemTransaction } from '@sso/database';
import { buildApp } from '../src/app.js';

describe('API Tenant Routing & Verification Tests', () => {
  let app: FastifyInstance;
  let testOrgId: string;
  let testOtherOrgId: string;
  let memberUserId: string;
  let nonMemberUserId: string;

  beforeAll(async () => {
    app = await buildApp({ logger: false });
    await app.ready();

    // Setup seeded organizations and test users
    await withSystemTransaction(async (tx) => {
      const [userA] = await tx
        .insert(users)
        .values({
          email: `api-tester-a-${Date.now()}@example.com`,
          status: 'active',
        })
        .returning();
      memberUserId = userA!.id;

      const [userB] = await tx
        .insert(users)
        .values({
          email: `api-tester-b-${Date.now()}@example.com`,
          status: 'active',
        })
        .returning();
      nonMemberUserId = userB!.id;
    });

    // Create an organization using OrganizationService/API
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/organizations',
      headers: {
        'x-user-id': memberUserId,
      },
      payload: {
        name: 'Route Test Corp',
        slug: `route-test-${Date.now()}`,
      },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.payload);
    testOrgId = body.data.id;

    // Create a second organization belonging to nonMemberUser
    const res2 = await app.inject({
      method: 'POST',
      url: '/api/v1/organizations',
      headers: {
        'x-user-id': nonMemberUserId,
      },
      payload: {
        name: 'Other Corp',
        slug: `other-test-${Date.now()}`,
      },
    });

    expect(res2.statusCode).toBe(201);
    const body2 = JSON.parse(res2.payload);
    testOtherOrgId = body2.data.id;
  });

  afterAll(async () => {
    await app.close();
    await closeDatabase();
  });

  describe('Organization Routes', () => {
    it('GET /api/v1/organizations: returns user organizations', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/organizations',
        headers: {
          'x-user-id': memberUserId,
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data.some((o: { id: string }) => o.id === testOrgId)).toBe(true);
      // Must NOT include other user's organization
      expect(body.data.some((o: { id: string }) => o.id === testOtherOrgId)).toBe(false);
    });

    it('GET /api/v1/organizations/:id: returns org details for member', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/organizations/${testOrgId}`,
        headers: {
          'x-user-id': memberUserId,
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.data.id).toBe(testOrgId);
      expect(body.data.name).toBe('Route Test Corp');
    });

    it('GET /api/v1/organizations/:id: rejects non-member with 403 Forbidden', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/organizations/${testOrgId}`,
        headers: {
          'x-user-id': nonMemberUserId, // Not a member of testOrgId
        },
      });

      expect(res.statusCode).toBe(403);
      const body = JSON.parse(res.payload);
      expect(body.error.code).toBe('INVALID_TENANT');
    });

    it('Rejects unauthenticated requests with 401 Unauthorized', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/organizations/${testOrgId}`,
      });

      expect(res.statusCode).toBe(401);
    });
  });

  describe('Tenant-Scoped Member Routes', () => {
    it('GET /api/v1/members: returns members for authorized tenant', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/members',
        headers: {
          'x-user-id': memberUserId,
          'x-organization-id': testOrgId,
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.success).toBe(true);
      expect(body.data.length).toBeGreaterThan(0);
      expect(body.data[0].userId).toBe(memberUserId);
    });

    it('POST /api/v1/members/invite: invites new member with role', async () => {
      // First get roles to obtain Owner/Admin/Member role id
      const rolesRes = await app.inject({
        method: 'GET',
        url: '/api/v1/roles',
        headers: {
          'x-user-id': memberUserId,
          'x-organization-id': testOrgId,
        },
      });

      const roles = JSON.parse(rolesRes.payload).data;
      const memberRole = roles.find((r: { name: string }) => r.name === 'Member');

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/members/invite',
        headers: {
          'x-user-id': memberUserId,
          'x-organization-id': testOrgId,
        },
        payload: {
          email: 'invited-colleague@example.com',
          roleId: memberRole.id,
        },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.payload);
      expect(body.data.email).toBe('invited-colleague@example.com');
      expect(body.data.organizationId).toBe(testOrgId);
    });
  });

  describe('Tenant-Scoped Role Routes', () => {
    it('GET /api/v1/roles: returns default seeded tenant roles', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/roles',
        headers: {
          'x-user-id': memberUserId,
          'x-organization-id': testOrgId,
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      const roleNames = body.data.map((r: { name: string }) => r.name);
      expect(roleNames).toContain('Owner');
      expect(roleNames).toContain('Admin');
      expect(roleNames).toContain('Member');
    });

    it('POST /api/v1/roles: creates custom role scoped to tenant', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/roles',
        headers: {
          'x-user-id': memberUserId,
          'x-organization-id': testOrgId,
        },
        payload: {
          name: 'Security Officer',
          description: 'Manages IdPs and audit logs',
          permissionKeys: ['idp:read', 'idp:create', 'audit:read'],
        },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.payload);
      expect(body.data.name).toBe('Security Officer');
      expect(body.data.organizationId).toBe(testOrgId);
      expect(body.data.permissions).toContain('idp:read');
    });
  });

  describe('Tenant-Scoped Identity Provider Routes', () => {
    it('POST & GET /api/v1/identity-providers: configures SAML/OIDC provider', async () => {
      const createRes = await app.inject({
        method: 'POST',
        url: '/api/v1/identity-providers',
        headers: {
          'x-user-id': memberUserId,
          'x-organization-id': testOrgId,
        },
        payload: {
          type: 'oidc',
          name: 'Corporate Okta',
          slug: 'okta-sso',
          domains: ['example.com'],
          config: {
            issuer: 'https://example.okta.com',
            clientId: 'client-12345',
          },
        },
      });

      expect(createRes.statusCode).toBe(201);
      const created = JSON.parse(createRes.payload).data;
      expect(created.slug).toBe('okta-sso');
      expect(created.organizationId).toBe(testOrgId);

      // List IdPs
      const listRes = await app.inject({
        method: 'GET',
        url: '/api/v1/identity-providers',
        headers: {
          'x-user-id': memberUserId,
          'x-organization-id': testOrgId,
        },
      });

      expect(listRes.statusCode).toBe(200);
      const list = JSON.parse(listRes.payload).data;
      expect(list.some((i: { slug: string }) => i.slug === 'okta-sso')).toBe(true);
    });
  });

  describe('Tenant-Scoped Audit Log Routes', () => {
    it('GET /api/v1/audit-logs: lists tenant audit trail', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/audit-logs',
        headers: {
          'x-user-id': memberUserId,
          'x-organization-id': testOrgId,
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.success).toBe(true);
      expect(body.data.length).toBeGreaterThan(0);
      expect(
        body.data.every((l: { organizationId: string }) => l.organizationId === testOrgId)
      ).toBe(true);
    });
  });
});
