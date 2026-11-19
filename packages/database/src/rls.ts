import { getClient } from './connection.js';

export const TENANT_OWNED_TABLES = [
  'organization_members',
  'roles',
  'role_permissions',
  'member_roles',
  'identity_providers',
  'user_identities',
  'invitations',
  'audit_logs',
  'sso_transactions',
] as const;

export interface RlsSetupOptions {
  appRoleName?: string;
  appRolePassword?: string;
}

/**
 * Applies PostgreSQL Row-Level Security (RLS) to all tenant-owned tables.
 * Also configures the application runtime role (`sso_app_user`) with NOBYPASSURLS
 * so that standard runtime operations are strictly checked against RLS.
 */
export async function applyRowLevelSecurity(options: RlsSetupOptions = {}): Promise<void> {
  const client = getClient();
  const appRoleName = options.appRoleName || 'sso_app_user';
  const appRolePassword = options.appRolePassword || 'sso_app_secret';

  // 1. Create or configure application runtime role (NOBYPASSRLS, NOSUPERUSER)
  await client.unsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${appRoleName}') THEN
        CREATE ROLE ${appRoleName} WITH LOGIN PASSWORD '${appRolePassword}' NOSUPERUSER NOBYPASSRLS;
      ELSE
        ALTER ROLE ${appRoleName} WITH NOSUPERUSER NOBYPASSRLS;
      END IF;
    END
    $$;
  `);

  // 2. Grant permissions on schema and tables to application runtime role
  await client.unsafe(`
    GRANT USAGE ON SCHEMA public TO ${appRoleName};
    GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ${appRoleName};
    GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO ${appRoleName};
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON TABLES TO ${appRoleName};
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON SEQUENCES TO ${appRoleName};
  `);

  // 3. Enable and enforce RLS and create tenant isolation policies
  for (const table of TENANT_OWNED_TABLES) {
    await client.unsafe(`
      -- Enable and Force RLS on table (so table owners must also adhere to RLS)
      ALTER TABLE IF EXISTS "${table}" ENABLE ROW LEVEL SECURITY;
      ALTER TABLE IF EXISTS "${table}" FORCE ROW LEVEL SECURITY;

      -- Drop existing policy if present
      DROP POLICY IF EXISTS tenant_isolation_policy ON "${table}";

      -- Create comprehensive RLS policy:
      -- Allows access if 'app.bypass_rls' is explicitly 'on',
      -- OR if the record's organization_id matches 'app.current_tenant_id'.
      CREATE POLICY tenant_isolation_policy ON "${table}"
        AS PERMISSIVE
        FOR ALL
        USING (
          current_setting('app.bypass_rls', true) = 'on'
          OR
          organization_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
        )
        WITH CHECK (
          current_setting('app.bypass_rls', true) = 'on'
          OR
          organization_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
        );
    `);
  }
}
