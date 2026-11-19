import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { resolve } from 'node:path';
import { closeDatabase, getDatabase } from './connection.js';
import { applyRowLevelSecurity } from './rls.js';

export async function runMigrations(): Promise<void> {
  const db = getDatabase();
  const migrationsFolder = resolve(import.meta.dirname, '../drizzle');

  console.info(`Applying Drizzle migrations from: ${migrationsFolder}`);
  await migrate(db, { migrationsFolder });
  console.info('✓ Schema migrations applied successfully.');

  console.info('Applying PostgreSQL Row-Level Security (RLS) policies and app role...');
  await applyRowLevelSecurity();
  console.info('✓ Row-Level Security policies enforced on all tenant-owned tables.');
}

// Auto-run when executed directly
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'))) {
  runMigrations()
    .then(async () => {
      await closeDatabase();
      process.exit(0);
    })
    .catch(async (error) => {
      console.error('Migration failed:', error);
      await closeDatabase();
      process.exit(1);
    });
}
