import test from 'node:test';
import assert from 'node:assert/strict';
import { createHealthMonitor } from '../src/health.js';

test('reports an unconfigured database without creating a pool', async () => {
  let created = false;
  const monitor = createHealthMonitor({ poolFactory: () => { created = true; } });

  const status = await monitor.check();

  assert.equal(status.database, 'not_configured');
  assert.equal(created, false);
});

test('recreates a failed pool and recovers on the next check', async () => {
  let attempts = 0;
  const monitor = createHealthMonitor({
    databaseUrl: 'postgres://example.test/app?sslmode=require',
    poolFactory: () => {
      attempts += 1;
      const succeeds = attempts === 2;
      return {
        query: async () => {
          if (!succeeds) throw new Error('temporary connection failure');
        },
        end: async () => {}
      };
    }
  });

  assert.equal((await monitor.check()).database, 'unhealthy');
  assert.equal((await monitor.check()).database, 'healthy');
  assert.equal(attempts, 2);
  await monitor.stop();
});
