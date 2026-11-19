export { getClient, getDatabase, closeDatabase } from './connection.js';
export { checkDatabaseHealth } from './health.js';
export { applyRowLevelSecurity, TENANT_OWNED_TABLES } from './rls.js';
export * from './schema/index.js';
export {
  withTenantTransaction,
  withSystemTransaction,
  withRawTenantTransaction,
  type DatabaseInstance,
  type DatabaseTransaction,
} from './tenant.js';
