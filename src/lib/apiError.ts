import { NextResponse } from 'next/server';
import { DbNotConfiguredError } from './db';

/** Every route handler's catch block funnels through here so a missing
 * DATABASE_URL during scaffolding returns a clear 503, not a stack trace. */
export function handleApiError(err: unknown): NextResponse {
  if (err instanceof DbNotConfiguredError) {
    return NextResponse.json({ error: err.message, code: 'db_not_configured' }, { status: 503 });
  }
  const message = err instanceof Error ? err.message : 'Unexpected error';
  // eslint-disable-next-line no-console
  console.error(err);
  return NextResponse.json({ error: message }, { status: 500 });
}
