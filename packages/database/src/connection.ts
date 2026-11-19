import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { databaseConfig } from '@sso/config';
import * as schema from './schema/index.js';

let queryClient: postgres.Sql | null = null;
let dbInstance: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getClient(): postgres.Sql {
  if (!queryClient) {
    queryClient = postgres(databaseConfig.url, {
      max: databaseConfig.poolMax,
      idle_timeout: 20,
      connect_timeout: 5,
      onnotice: () => {}, // suppress verbose notices
    });
  }
  return queryClient;
}

export function getDatabase(): ReturnType<typeof drizzle<typeof schema>> {
  if (!dbInstance) {
    dbInstance = drizzle(getClient(), { schema });
  }
  return dbInstance;
}

export async function closeDatabase(): Promise<void> {
  if (queryClient) {
    await queryClient.end({ timeout: 5 });
    queryClient = null;
    dbInstance = null;
  }
}
