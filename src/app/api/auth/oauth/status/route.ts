import { NextResponse } from 'next/server';
import { isGoogleConfigured, isFacebookConfigured } from '@/lib/oauth';

/** Public: tells the login/register pages which social buttons to enable.
 * No secrets are exposed — just two booleans. */
export async function GET() {
  return NextResponse.json({ google: isGoogleConfigured(), facebook: isFacebookConfigured() });
}
