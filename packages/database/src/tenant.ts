import { sql } from 'drizzle-orm';
import { getClient, getDatabase } from './connection.js';

export type DatabaseInstance = ReturnType<typeof getDatabase>;
export type DatabaseTransaction = Parameters<Parameters<DatabaseInstance['transaction']>[0]>[0];

/**
 * Executes operations within a transaction scoped strictly to a verified tenant ID.
 * Uses PostgreSQL transaction-local configuration (`set_config(..., is_local=true)`),
 * ensuring the tenant setting automatically discards at transaction boundaries
 * and cannot leak across connection pool reuses.
 */
export async function withTenantTransaction<T>(
  tenantId: string,
  callback: (tx: DatabaseTransaction) => Promise<T>
): Promise<T> {
  if (!tenantId || typeof tenantId !== 'string') {
    throw new Error('Tenant context required: tenantId must be a valid non-empty string');
  }

  const db = getDatabase();

  return db.transaction(async (tx) => {
    // Set transaction-local tenant context
    await tx.execute(sql`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`);
    await tx.execute(sql`SELECT set_config('app.bypass_rls', 'off', true)`);

    return callback(tx);
  });
}

/**
 * Executes trusted platform-level operations inside a transaction where RLS bypass is explicitly enabled.
 * Restricted to superadmin or internal system tasks (e.g., initial tenant creation, platform migrations).
 */
export async function withSystemTransaction<T>(
  callback: (tx: DatabaseTransaction) => Promise<T>
): Promise<T> {
  const db = getDatabase();

  return db.transaction(async (tx) => {
    // Enable RLS bypass transaction-locally
    await tx.execute(sql`SELECT set_config('app.bypass_rls', 'on', true)`);
    await tx.execute(sql`SELECT set_config('app.current_tenant_id', '', true)`);

    return callback(tx);
  });
}

/**
 * Direct transaction runner on raw postgres.js client when needed (e.g. for connection tests).
 */
export async function withRawTenantTransaction<T>(
  tenantId: string,
  callback: (sql: ReturnType<typeof getClient>) => Promise<T>
): Promise<T> {
  const client = getClient();
  const result = await client.begin(async (sql) => {
    await sql`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`;
    await sql`SELECT set_config('app.bypass_rls', 'off', true)`;
    return callback(sql as unknown as ReturnType<typeof getClient>);
  });
  return result as unknown as T;
}
