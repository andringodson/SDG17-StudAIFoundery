import { NextResponse } from 'next/server';
import { DbNotConfiguredError } from './db';

/** Every route handler's catch block funnels through here so a missing
 * DATABASE_URL during scaffolding returns a clear 503, not a stack trace. */
export function handleApiError(err: unknown): NextResponse {
  if (err instanceof DbNotConfiguredError) {
    // The setup instructions ("set DATABASE_URL in .env.local…") go to the
    // deploy log, not over the wire — they were written for whoever runs the
    // app, and this response renders on public pages. The client maps the
    // code to visitor-facing copy; see authErrorMessage.
    // eslint-disable-next-line no-console
    console.error('[apiError]', err.message);
    return NextResponse.json({ code: 'db_not_configured' }, { status: 503 });
  }
  // The real error goes to the server log; the client gets a generic message.
  // Raw `err.message` here can carry connection strings, table names, or
  // driver internals — none of which belong on a public page.
  // eslint-disable-next-line no-console
  console.error(err);
  return NextResponse.json(
    { error: 'Something went wrong on our side. Please try again.', code: 'server_error' },
    { status: 500 }
  );
}
