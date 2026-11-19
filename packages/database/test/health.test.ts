import { describe, expect, it } from 'vitest';
import { checkDatabaseHealth } from '../src/health.js';

describe('Database Health Check Layer', () => {
  it('returns structured health response with status and metrics', async () => {
    const health = await checkDatabaseHealth();
    expect(health).toHaveProperty('status');
    expect(['connected', 'disconnected']).toContain(health.status);

    if (health.status === 'connected') {
      expect(health).toHaveProperty('latencyMs');
      expect(typeof health.latencyMs).toBe('number');
    } else {
      expect(health).toHaveProperty('error');
      expect(typeof health.error).toBe('string');
    }
  });
});
