import { Pool, type QueryResultRow } from 'pg';

/**
 * Lazily-created singleton pool. DATABASE_URL is intentionally read at call
 * time, not at import time — importing this module (e.g. from a page that
 * doesn't touch the DB) must never throw just because the env var is unset
 * in a scaffolding/dev context.
 */
let pool: Pool | null = null;

/** We always pass our own explicit `ssl` option below, so a `sslmode=…`
 * query param left over from Neon's copy-paste connection string is dead
 * weight — but pg-connection-string still parses it and logs a scary
 * "SECURITY WARNING" on every single connection, drowning out real errors
 * in the production log. Stripping it here is silent and behaviourally a
 * no-op (falls through unchanged if the string isn't a valid URL). */
function withoutSslModeParam(connectionString: string): string {
  try {
    const url = new URL(connectionString);
    url.searchParams.delete('sslmode');
    return url.toString();
  } catch {
    return connectionString;
  }
}

export function getPool(): Pool {
  if (pool) return pool;
  const raw = process.env.DATABASE_URL;
  if (!raw) {
    throw new DbNotConfiguredError();
  }
  pool = new Pool({
    connectionString: withoutSslModeParam(raw),
    ssl: raw.includes('sslmode=require') || process.env.NODE_ENV === 'production'
      ? { rejectUnauthorized: false }
      : undefined,
    max: 5
  });
  return pool;
}

export class DbNotConfiguredError extends Error {
  constructor() {
    super('DATABASE_URL is not set. Create a Postgres project (Neon recommended) and set it in .env.local — see README.md.');
    this.name = 'DbNotConfiguredError';
  }
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = []
): Promise<T[]> {
  const client = getPool();
  const result = await client.query<T>(text, params);
  return result.rows;
}

export function isDbConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}
