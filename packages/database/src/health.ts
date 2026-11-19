import type { DatabaseHealthInfo } from '@sso/shared';
import { getClient } from './connection.js';

export async function checkDatabaseHealth(): Promise<DatabaseHealthInfo> {
  const startTime = Date.now();
  try {
    const client = getClient();
    await client`SELECT 1`;
    const latencyMs = Date.now() - startTime;
    return {
      status: 'connected',
      latencyMs,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown database error';
    return {
      status: 'disconnected',
      error: message,
    };
  }
}
