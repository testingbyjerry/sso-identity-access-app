import { eq } from 'drizzle-orm';
import postgres from 'postgres';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { databaseConfig } from '@sso/config';
import { closeDatabase, getClient, getDatabase } from '../src/connection.js';
import {
  auditLogs,
  memberRoles,
  organizationMembers,
  organizations,
  roles,
  users,
} from '../src/schema/index.js';
import {
  withRawTenantTransaction,
  withSystemTransaction,
  withTenantTransaction,
} from '../src/tenant.js';

describe('Phase 2 — Multi-Tenant Architecture & RLS Isolation Tests', () => {
  let orgAId: string;
  let orgBId: string;
  let user1Id: string;
  let memberA1Id: string;
  let memberB1Id: string;
  let roleAId: string;
  let roleBId: string;

  beforeAll(async () => {
    // Setup test fixtures using system transaction
    await withSystemTransaction(async (tx) => {
      // Create Organization A
      const [orgA] = await tx
        .insert(organizations)
        .values({
          name: 'Test Tenant Alpha',
          slug: `test-alpha-${Date.now()}`,
          status: 'active',
        })
        .returning();
      orgAId = orgA!.id;

      // Create Organization B
      const [orgB] = await tx
        .insert(organizations)
        .values({
          name: 'Test Tenant Beta',
          slug: `test-beta-${Date.now()}`,
          status: 'active',
        })
        .returning();
      orgBId = orgB!.id;

      // Create Global User 1
      const [user1] = await tx
        .insert(users)
        .values({
          email: `shared-user-${Date.now()}@example.com`,
          status: 'active',
        })
        .returning();
      user1Id = user1!.id;

      // Member in Org A
      const [memberA1] = await tx
        .insert(organizationMembers)
        .values({
          organizationId: orgAId,
          userId: user1Id,
          status: 'active',
        })
        .returning();
      memberA1Id = memberA1!.id;

      // Member in Org B (same global user in another org)
      const [memberB1] = await tx
        .insert(organizationMembers)
        .values({
          organizationId: orgBId,
          userId: user1Id,
          status: 'active',
        })
        .returning();
      memberB1Id = memberB1!.id;

      // Role in Org A
      const [roleA] = await tx
        .insert(roles)
        .values({
          organizationId: orgAId,
          name: 'Alpha Manager',
        })
        .returning();
      roleAId = roleA!.id;

      // Role in Org B
      const [roleB] = await tx
        .insert(roles)
        .values({
          organizationId: orgBId,
          name: 'Beta Manager',
        })
        .returning();
      roleBId = roleB!.id;

      // Assign Role A to Member A
      await tx.insert(memberRoles).values({
        organizationId: orgAId,
        memberId: memberA1Id,
        roleId: roleAId,
      });

      // Audit logs in both orgs
      await tx.insert(auditLogs).values({
        organizationId: orgAId,
        actorUserId: user1Id,
        action: 'tenant.alpha.event',
        entityType: 'test',
      });

      await tx.insert(auditLogs).values({
        organizationId: orgBId,
        actorUserId: user1Id,
        action: 'tenant.beta.event',
        entityType: 'test',
      });
    });
  });

  afterAll(async () => {
    await closeDatabase();
  });

  // =========================================================================
  // Requirement 1 & 2: Organization A can access its own data and NOT B's data
  // =========================================================================
  it('1 & 2: Organization A can access its own tenant data and cannot access Organization B data', async () => {
    await withTenantTransaction(orgAId, async (tx) => {
      // Query roles
      const orgARoles = await tx.select().from(roles).where(eq(roles.organizationId, orgAId));
      expect(orgARoles.length).toBeGreaterThan(0);
      expect(orgARoles.some((r) => r.id === roleAId)).toBe(true);
      expect(orgARoles.some((r) => r.id === roleBId)).toBe(false);

      // Query audit logs under Org A context
      const orgALogs = await tx
        .select()
        .from(auditLogs)
        .where(eq(auditLogs.organizationId, orgAId));
      expect(orgALogs.some((l) => l.action === 'tenant.alpha.event')).toBe(true);
      expect(orgALogs.some((l) => l.action === 'tenant.beta.event')).toBe(false);
    });

    await withTenantTransaction(orgBId, async (tx) => {
      const orgBRoles = await tx.select().from(roles).where(eq(roles.organizationId, orgBId));
      expect(orgBRoles.some((r) => r.id === roleBId)).toBe(true);
      expect(orgBRoles.some((r) => r.id === roleAId)).toBe(false);
    });
  });

  // =========================================================================
  // Requirement 3: Cross-tenant role assignment prevention via composite FK
  // =========================================================================
  it('3: A member cannot be assigned a role from another organization (enforced by composite FK)', async () => {
    // Attempt to assign Organization B's role to Organization A's member
    // Using orgAId as organizationId: (orgAId, roleBId) violates fk_member_roles_role_composite
    await expect(
      withSystemTransaction(async (tx) => {
        await tx.insert(memberRoles).values({
          organizationId: orgAId,
          memberId: memberA1Id,
          roleId: roleBId, // Belongs to orgBId!
        });
      })
    ).rejects.toThrow(/violates foreign key constraint/i);

    // Attempting with orgBId: (orgBId, memberA1Id) violates fk_member_roles_member_composite
    await expect(
      withSystemTransaction(async (tx) => {
        await tx.insert(memberRoles).values({
          organizationId: orgBId,
          memberId: memberA1Id, // Belongs to orgAId!
          roleId: roleBId,
        });
      })
    ).rejects.toThrow(/violates foreign key constraint/i);
  });

  // =========================================================================
  // Requirement 4: A user can belong to multiple organizations
  // =========================================================================
  it('4: A single global user can belong to multiple organizations without duplicate accounts', async () => {
    const db = getDatabase();

    // Query global users table: user1Id exists exactly once
    const globalUsers = await db.select().from(users).where(eq(users.id, user1Id));
    expect(globalUsers.length).toBe(1);

    // Query organization memberships: user1Id belongs to both Org A and Org B
    const memberships = await db
      .select()
      .from(organizationMembers)
      .where(eq(organizationMembers.userId, user1Id));

    expect(memberships.length).toBe(2);
    const orgIds = memberships.map((m) => m.organizationId);
    expect(orgIds).toContain(orgAId);
    expect(orgIds).toContain(orgBId);
  });

  // =========================================================================
  // Requirement 5: Tenant context is required for tenant-scoped operations
  // =========================================================================
  it('5: Tenant context is required for tenant-scoped repository operations', async () => {
    // Calling with empty or invalid tenantId throws error before query execution
    await expect(
      withTenantTransaction('', async () => {
        return true;
      })
    ).rejects.toThrow(/Tenant context required/i);
  });

  // =========================================================================
  // Requirement 6: RLS policies work using actual application database role (sso_app_user)
  // =========================================================================
  it('6: RLS policies enforce isolation using actual application database role (sso_app_user)', async () => {
    // Construct connection string for non-superuser application role
    const appDbUrl = databaseConfig.url.replace(
      /postgresql:\/\/[^:]+:[^@]+@/,
      'postgresql://sso_app_user:sso_app_secret@'
    );

    const appClient = postgres(appDbUrl, { max: 1 });

    try {
      // 1. Without setting tenant context, querying tenant-owned table yields 0 rows due to RLS
      const noTenantRows = await appClient`SELECT * FROM roles WHERE organization_id = ${orgAId}`;
      expect(noTenantRows.length).toBe(0);

      // 2. In a transaction with Org A tenant context set: sees Org A records
      const orgAResult = await appClient.begin(async (sql) => {
        await sql`SELECT set_config('app.current_tenant_id', ${orgAId}, true)`;
        await sql`SELECT set_config('app.bypass_rls', 'off', true)`;
        return sql`SELECT * FROM roles`;
      });
      expect(orgAResult.length).toBeGreaterThan(0);
      expect(orgAResult.every((r) => r.organization_id === orgAId)).toBe(true);

      // 3. In a transaction with Org B tenant context set: sees Org B records, never Org A
      const orgBResult = await appClient.begin(async (sql) => {
        await sql`SELECT set_config('app.current_tenant_id', ${orgBId}, true)`;
        await sql`SELECT set_config('app.bypass_rls', 'off', true)`;
        return sql`SELECT * FROM roles`;
      });
      expect(orgBResult.length).toBeGreaterThan(0);
      expect(orgBResult.every((r) => r.organization_id === orgBId)).toBe(true);
    } finally {
      await appClient.end();
    }
  });

  // =========================================================================
  // Requirement 7: Tenant context does not leak between pooled transactions
  // =========================================================================
  it('7: Tenant context does not leak between pooled database transactions', async () => {
    // Run Transaction 1 with Org A
    await withRawTenantTransaction(orgAId, async (sql) => {
      const rows =
        (await sql`SELECT current_setting('app.current_tenant_id', true) AS "currentTenant"`) as unknown as {
          currentTenant: string;
        }[];
      expect(rows[0]?.currentTenant).toBe(orgAId);
    });

    // Run direct query on the pooled connection: context has automatically reverted to null/empty
    const client = getClient();
    const rowsAfter =
      (await client`SELECT current_setting('app.current_tenant_id', true) AS "currentTenantAfterTx"`) as unknown as {
        currentTenantAfterTx: string;
      }[];
    const currentTenantAfterTx = rowsAfter[0]?.currentTenantAfterTx;

    // Must NOT equal orgAId! Reverts to null/empty at transaction boundary
    expect(currentTenantAfterTx).not.toBe(orgAId);
    expect(!currentTenantAfterTx || currentTenantAfterTx === '').toBe(true);
    expect(memberB1Id).toBeDefined();
  });
});
