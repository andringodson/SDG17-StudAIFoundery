#!/usr/bin/env node
/**
 * Minimal migration runner: applies db/schema.sql against DATABASE_URL.
 * Idempotent — every statement in schema.sql uses IF NOT EXISTS / DO blocks,
 * so running this twice against the same database is safe.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import pg from 'pg';

const { Client } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL is not set. Create a Supabase/Postgres project and set it in .env.local.');
    process.exit(1);
  }

  const sql = readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  const client = new Client({
    connectionString,
    ssl: connectionString.includes('sslmode=require') ? { rejectUnauthorized: false } : undefined
  });

  await client.connect();
  console.log('Connected. Applying schema.sql...');
  try {
    await client.query(sql);
    console.log('Schema applied successfully.');
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
