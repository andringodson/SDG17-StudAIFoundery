import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { query } from '@/lib/db';
import { hashPassword, setSessionCookie } from '@/lib/auth';
import { checkPassword } from '@/lib/passwordStrength';
import { handleApiError } from '@/lib/apiError';
import { generateOtp } from '@/lib/otp';
import { sendOtpEmail } from '@/lib/mailer';

const Base = z.object({
  fullName: z.string().min(2).max(120),
  username: z.string().min(3).max(50),
  email: z.string().email(),
  password: z.string().min(8).max(200)
});

const CompanyBody = Base.extend({
  role: z.literal('company'),
  companyName: z.string().min(2).max(160),
  website: z.string().max(255).optional(),
  industry: z.string().min(1).max(80),
  country: z.string().min(1).max(80),
  city: z.string().min(1).max(80),
  yearFounded: z.number().int().min(1800).max(new Date().getFullYear())
});

const InvestorBody = Base.extend({
  role: z.literal('investor'),
  investorType: z.string().min(1).max(60),
  organisationName: z.string().max(160).optional(),
  country: z.string().min(1).max(80),
  preferredSector: z.string().min(1).max(80),
  preferredStage: z.string().min(1).max(60)
});

const GeneralBody = Base.extend({ role: z.literal('general_user') });

const RoleBody = z.discriminatedUnion('role', [CompanyBody, InvestorBody, GeneralBody]);

/** Back-compat: the original quick-register panel (still live in the Action
 * Centre) posts {username, email, password} with no role or fullName. Fill
 * in defaults so that existing form keeps working unmodified. */
const Body = z.preprocess((input) => {
  const obj = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  return {
    fullName: obj.fullName ?? obj.username,
    role: obj.role ?? 'general_user',
    ...obj
  };
}, RoleBody);

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const parsed = Body.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 });
    }
    const data = parsed.data;

    const strength = checkPassword(data.password);
    if (!strength.valid) {
      return NextResponse.json(
        { error: 'weak_password', missing: strength.missing },
        { status: 400 }
      );
    }

    const existing = await query<{ id: string }>(
      'SELECT id FROM users WHERE username = $1 OR email = $2',
      [data.username, data.email]
    );
    if (existing.length > 0) {
      return NextResponse.json({ error: 'email_registered' }, { status: 409 });
    }

    const passwordHash = await hashPassword(data.password);
    const rows = await query<{ id: string; username: string; role: string; session_version: number }>(
      `INSERT INTO users (username, email, password_hash, role, full_name, profile_completed_pct)
       VALUES ($1, $2, $3, $4, $5, 20) RETURNING id, username, role, session_version`,
      [data.username, data.email, passwordHash, data.role, data.fullName]
    );
    const user = rows[0]!;

    await query('INSERT INTO user_progress (user_id) VALUES ($1) ON CONFLICT DO NOTHING', [user.id]);

    const { code, expiresAt } = generateOtp();
    await query('UPDATE users SET otp_code = $1, otp_expires_at = $2 WHERE id = $3', [code, expiresAt, user.id]);
    const emailDelivery = await sendOtpEmail(data.email, code);

    if (data.role === 'company') {
      await query(
        `INSERT INTO company_profiles (user_id, company_name, website, industry, country, city, year_founded)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [user.id, data.companyName, data.website ?? null, data.industry, data.country, data.city, data.yearFounded]
      );
    } else if (data.role === 'investor') {
      await query(
        `INSERT INTO investor_profiles (user_id, investor_type, organisation_name, country, preferred_sector, preferred_stage)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [user.id, data.investorType, data.organisationName ?? null, data.country, data.preferredSector, data.preferredStage]
      );
    }

    await setSessionCookie({
      userId: user.id,
      username: user.username,
      role: user.role as 'company' | 'investor' | 'general_user',
      sessionVersion: user.session_version
    });

    return NextResponse.json({ user: { id: user.id, username: user.username, role: user.role }, emailDelivery }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
