import { Pool, type QueryResultRow } from 'pg';

/**
 * Lazily-created singleton pool. DATABASE_URL is intentionally read at call
 * time, not at import time — importing this module (e.g. from a page that
 * doesn't touch the DB) must never throw just because the env var is unset
 * in a scaffolding/dev context.
 */
let pool: Pool | null = null;

export function getPool(): Pool {
  if (pool) return pool;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new DbNotConfiguredError();
  }
  pool = new Pool({
    connectionString,
    ssl: connectionString.includes('sslmode=require') || process.env.NODE_ENV === 'production'
      ? { rejectUnauthorized: false }
      : undefined,
    max: 5
  });
  return pool;
}

export class DbNotConfiguredError extends Error {
  constructor() {
    super('DATABASE_URL is not set. Create a Supabase/Postgres project and set it in .env.local — see README.md.');
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
