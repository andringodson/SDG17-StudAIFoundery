import pg from 'pg';

/**
 * Continuously checks dependencies that keep the real-time service useful.
 *
 * A failed Postgres client is discarded after a failed probe so the next probe
 * creates a fresh pool. This is safe, bounded recovery: it never changes user
 * data, schema, credentials, or application code.
 */
export function createHealthMonitor({
  databaseUrl,
  botConfigured = false,
  intervalMs = 30_000,
  poolFactory = (options) => new pg.Pool(options),
  now = () => new Date().toISOString()
} = {}) {
  let pool = null;
  let timer = null;
  let checking = false;
  const state = {
    database: databaseUrl ? 'checking' : 'not_configured',
    bot: botConfigured ? 'configured' : 'not_configured',
    lastCheckAt: null,
    lastDatabaseSuccessAt: null,
    lastError: null
  };

  async function discardPool() {
    const stalePool = pool;
    pool = null;
    await stalePool?.end().catch(() => {});
  }

  async function check() {
    if (checking) return snapshot();
    checking = true;
    state.lastCheckAt = now();

    try {
      if (!databaseUrl) return snapshot();
      if (!pool) {
        pool = poolFactory({
          connectionString: databaseUrl,
          ssl: databaseUrl.includes('sslmode=require') ? { rejectUnauthorized: false } : undefined,
          max: 2
        });
      }

      await pool.query('SELECT 1');
      state.database = 'healthy';
      state.lastDatabaseSuccessAt = now();
      state.lastError = null;
    } catch (error) {
      state.database = 'unhealthy';
      state.lastError = error instanceof Error ? error.message : 'Unknown database error';
      await discardPool();
    } finally {
      checking = false;
    }

    return snapshot();
  }

  function snapshot() {
    return { ...state };
  }

  function start() {
    void check();
    timer = setInterval(() => void check(), intervalMs);
    timer.unref?.();
  }

  async function stop() {
    if (timer) clearInterval(timer);
    timer = null;
    await discardPool();
  }

  return { check, snapshot, start, stop };
}
