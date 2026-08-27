import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth';
import { query } from '@/lib/db';
import { handleApiError } from '@/lib/apiError';
import { sendSupportConfirmation, sendSupportSmsConfirmation } from '@/lib/mailer';

const CreateBody = z.object({
  category: z.enum(['account', 'technical', 'partnership-builder', 'map', 'other']),
  description: z.string().min(10).max(4000),
  currentPage: z.string().max(255).optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().min(7).max(20).regex(/^[0-9+\-() ]+$/, 'Enter a valid phone number.').optional(),
  contactConsent: z.boolean().default(false)
});

function reference() {
  return `SDG-${crypto.randomUUID().replaceAll('-', '').slice(0, 10).toUpperCase()}`;
}

export async function POST(req: NextRequest) {
  try {
    const parsed = CreateBody.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid support request' }, { status: 400 });
    const session = await getSession();
    const data = parsed.data;
    const rows = await query<{ reference: string; status: string }>(
      `INSERT INTO support_tickets (reference, user_id, category, description, current_page, contact_email, contact_phone, contact_consent)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING reference, status`,
      [
        reference(), session?.userId ?? null, data.category, data.description, data.currentPage ?? null,
        data.contactConsent ? data.contactEmail ?? null : null,
        data.contactConsent ? data.contactPhone ?? null : null,
        data.contactConsent
      ]
    );
    const ticket = rows[0]!;

    // Email and SMS confirmations are attempted independently — one channel
    // failing (or not being configured) never blocks the other, and neither
    // ever blocks the ticket itself from being created.
    const emailConfirmation = data.contactConsent && data.contactEmail
      ? await sendSupportConfirmation(data.contactEmail, ticket.reference, ticket.status)
      : { delivered: false };
    const smsConfirmation = data.contactConsent && data.contactPhone
      ? await sendSupportSmsConfirmation(data.contactPhone, ticket.reference)
      : { delivered: false };

    return NextResponse.json({
      ...ticket,
      confirmationDelivered: emailConfirmation.delivered,
      smsDelivered: smsConfirmation.delivered
    }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function GET(req: NextRequest) {
  try {
    const reference = new URL(req.url).searchParams.get('reference');
    if (!reference || !/^SDG-[A-Z0-9]{10}$/.test(reference)) return NextResponse.json({ error: 'Enter a valid support reference.' }, { status: 400 });
    const rows = await query<{ reference: string; status: string; created_at: string; updated_at: string }>(
      'SELECT reference, status, created_at, updated_at FROM support_tickets WHERE reference = $1', [reference]
    );
    if (!rows[0]) return NextResponse.json({ error: 'No request found for that reference.' }, { status: 404 });
    return NextResponse.json(rows[0]);
  } catch (err) {
    return handleApiError(err);
  }
}
