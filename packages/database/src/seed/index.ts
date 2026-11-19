import { eq } from 'drizzle-orm';
import { closeDatabase } from '../connection.js';
import {
  auditLogs,
  memberRoles,
  organizationMembers,
  organizations,
  permissions,
  rolePermissions,
  roles,
  users,
} from '../schema/index.js';
import { withSystemTransaction } from '../tenant.js';

export const DEFAULT_PERMISSIONS = [
  // Organization
  { key: 'org:read', description: 'View organization details', category: 'organization' },
  { key: 'org:update', description: 'Update organization settings', category: 'organization' },
  { key: 'org:delete', description: 'Delete organization', category: 'organization' },

  // Members
  { key: 'member:read', description: 'View organization members', category: 'members' },
  { key: 'member:invite', description: 'Invite new members', category: 'members' },
  { key: 'member:update', description: 'Update member status and roles', category: 'members' },
  { key: 'member:remove', description: 'Remove members from organization', category: 'members' },

  // Roles
  { key: 'role:read', description: 'View roles and permissions', category: 'roles' },
  { key: 'role:create', description: 'Create custom roles', category: 'roles' },
  { key: 'role:update', description: 'Modify custom roles', category: 'roles' },
  { key: 'role:delete', description: 'Delete custom roles', category: 'roles' },

  // Identity Providers / SSO
  { key: 'idp:read', description: 'View configured identity providers', category: 'sso' },
  { key: 'idp:create', description: 'Configure new identity provider', category: 'sso' },
  { key: 'idp:update', description: 'Modify identity provider configuration', category: 'sso' },
  { key: 'idp:delete', description: 'Delete identity provider', category: 'sso' },

  // Audit Logs
  { key: 'audit:read', description: 'View tenant security audit logs', category: 'audit' },
];

export async function runSeed(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to run development seed in production environment!');
  }

  console.info('Starting development seed process...');

  await withSystemTransaction(async (tx) => {
    // 1. Seed global platform permissions
    console.info('Seeding platform permissions...');
    const insertedPermissions: Record<string, string> = {};

    for (const perm of DEFAULT_PERMISSIONS) {
      const [existing] = await tx.select().from(permissions).where(eq(permissions.key, perm.key));

      if (existing) {
        insertedPermissions[perm.key] = existing.id;
      } else {
        const [created] = await tx.insert(permissions).values(perm).returning();
        if (created) {
          insertedPermissions[perm.key] = created.id;
        }
      }
    }

    // Helper to seed standard roles for an organization
    const seedOrgRoles = async (orgId: string) => {
      const roleDefs = [
        {
          name: 'Owner',
          description: 'Full administrative access to the organization',
          isSystem: true,
          permissionKeys: Object.keys(insertedPermissions),
        },
        {
          name: 'Admin',
          description: 'Administrative access except destructive ownership transfer',
          isSystem: true,
          permissionKeys: [
            'org:read',
            'org:update',
            'member:read',
            'member:invite',
            'member:update',
            'member:remove',
            'role:read',
            'idp:read',
            'idp:create',
            'idp:update',
            'idp:delete',
            'audit:read',
          ],
        },
        {
          name: 'Member',
          description: 'Standard access to organization resources',
          isSystem: true,
          permissionKeys: ['org:read', 'member:read', 'role:read'],
        },
        {
          name: 'Viewer',
          description: 'Read-only access to organization information',
          isSystem: true,
          permissionKeys: ['org:read', 'member:read'],
        },
      ];

      const createdRoles: Record<string, string> = {};

      for (const def of roleDefs) {
        let role = (await tx.select().from(roles).where(eq(roles.organizationId, orgId))).find(
          (r) => r.name === def.name
        );

        if (!role) {
          const [newRole] = await tx
            .insert(roles)
            .values({
              organizationId: orgId,
              name: def.name,
              description: def.description,
              isSystem: def.isSystem,
            })
            .returning();
          role = newRole;
        }

        if (role) {
          createdRoles[def.name] = role.id;

          // Assign role permissions
          for (const key of def.permissionKeys) {
            const permId = insertedPermissions[key];
            if (permId) {
              const existingPerm = (
                await tx.select().from(rolePermissions).where(eq(rolePermissions.roleId, role.id))
              ).find((rp) => rp.permissionId === permId);

              if (!existingPerm) {
                await tx.insert(rolePermissions).values({
                  organizationId: orgId,
                  roleId: role.id,
                  permissionId: permId,
                });
              }
            }
          }
        }
      }

      return createdRoles;
    };

    // 2. Seed Organization 1: Acme Corporation
    console.info('Seeding Organization A: Acme Corporation...');
    let [acmeOrg] = await tx.select().from(organizations).where(eq(organizations.slug, 'acme'));

    if (!acmeOrg) {
      const [created] = await tx
        .insert(organizations)
        .values({
          name: 'Acme Corporation',
          slug: 'acme',
          domain: 'acme.demo',
          status: 'active',
          metadata: { plan: 'enterprise', maxMembers: 100 },
        })
        .returning();
      acmeOrg = created!;
    }

    const acmeRoles = await seedOrgRoles(acmeOrg.id);

    // 3. Seed Demo User 1: Alice (Global user)
    console.info('Seeding demo user: Alice (admin@acme.demo)...');
    let [alice] = await tx.select().from(users).where(eq(users.email, 'admin@acme.demo'));

    if (!alice) {
      const [created] = await tx
        .insert(users)
        .values({
          email: 'admin@acme.demo',
          firstName: 'Alice',
          lastName: 'Admin',
          isSuperAdmin: true,
          status: 'active',
          emailVerifiedAt: new Date(),
        })
        .returning();
      alice = created!;
    }

    // Add Alice to Acme Corporation as Owner
    let [aliceAcmeMember] = await tx
      .select()
      .from(organizationMembers)
      .where(eq(organizationMembers.organizationId, acmeOrg.id));

    if (!aliceAcmeMember) {
      const [created] = await tx
        .insert(organizationMembers)
        .values({
          organizationId: acmeOrg.id,
          userId: alice.id,
          status: 'active',
        })
        .returning();
      aliceAcmeMember = created!;

      if (acmeRoles['Owner']) {
        await tx.insert(memberRoles).values({
          organizationId: acmeOrg.id,
          memberId: aliceAcmeMember.id,
          roleId: acmeRoles['Owner'],
        });
      }

      await tx.insert(auditLogs).values({
        organizationId: acmeOrg.id,
        actorUserId: alice.id,
        action: 'organization.created',
        entityType: 'organization',
        entityId: acmeOrg.id,
        metadata: { initialSeed: true },
      });
    }

    // 4. Seed Organization 2: Beta Industries (proving multi-tenancy)
    console.info('Seeding Organization B: Beta Industries...');
    let [betaOrg] = await tx.select().from(organizations).where(eq(organizations.slug, 'beta'));

    if (!betaOrg) {
      const [created] = await tx
        .insert(organizations)
        .values({
          name: 'Beta Industries',
          slug: 'beta',
          domain: 'beta.demo',
          status: 'active',
          metadata: { plan: 'standard' },
        })
        .returning();
      betaOrg = created!;
    }

    const betaRoles = await seedOrgRoles(betaOrg.id);

    // 5. Seed Demo User 2: Bob (Global user)
    let [bob] = await tx.select().from(users).where(eq(users.email, 'bob@beta.demo'));

    if (!bob) {
      const [created] = await tx
        .insert(users)
        .values({
          email: 'bob@beta.demo',
          firstName: 'Bob',
          lastName: 'Builder',
          isSuperAdmin: false,
          status: 'active',
          emailVerifiedAt: new Date(),
        })
        .returning();
      bob = created!;
    }

    // Add Bob to Beta as Owner
    let [bobBetaMember] = await tx
      .select()
      .from(organizationMembers)
      .where(eq(organizationMembers.organizationId, betaOrg.id));

    if (!bobBetaMember) {
      const [created] = await tx
        .insert(organizationMembers)
        .values({
          organizationId: betaOrg.id,
          userId: bob.id,
          status: 'active',
        })
        .returning();
      bobBetaMember = created!;

      if (betaRoles['Owner']) {
        await tx.insert(memberRoles).values({
          organizationId: betaOrg.id,
          memberId: bobBetaMember.id,
          roleId: betaRoles['Owner'],
        });
      }
    }

    // 6. Demonstrate multi-membership: Add Alice to Beta Industries as well (as 'Member')
    const [aliceBetaMember] = (
      await tx
        .select()
        .from(organizationMembers)
        .where(eq(organizationMembers.organizationId, betaOrg.id))
    ).filter((m) => m.userId === alice.id);

    if (!aliceBetaMember) {
      const [created] = await tx
        .insert(organizationMembers)
        .values({
          organizationId: betaOrg.id,
          userId: alice.id,
          status: 'active',
        })
        .returning();

      if (betaRoles['Member'] && created) {
        await tx.insert(memberRoles).values({
          organizationId: betaOrg.id,
          memberId: created.id,
          roleId: betaRoles['Member'],
        });
      }
    }

    console.info('✓ Development seed completed successfully.');
  });
}

// Auto-run when executed directly
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'))) {
  runSeed()
    .then(async () => {
      await closeDatabase();
      process.exit(0);
    })
    .catch(async (error) => {
      console.error('Seed failed:', error);
      await closeDatabase();
      process.exit(1);
    });
}
