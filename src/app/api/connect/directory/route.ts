import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireApiRole } from '@/lib/requireRole';
import { handleApiError } from '@/lib/apiError';
import { computeMatchScore, matchLabel, type ConnectRole, type DirectoryEntry } from '@/lib/connect/matching';

interface Row {
  user_id: string;
  role: ConnectRole;
  org_name: string;
  subtitle: string | null;
  sector: string | null;
  location: string | null;
}

/**
 * Real accounts only — every row here is a company, investor, or government
 * profile someone actually registered (self-declared, same as the rest of
 * this platform's roles; see db/schema.sql). Nothing is seeded or invented.
 */
export async function GET() {
  const session = await requireApiRole('company', 'investor', 'government', 'general_user');
  if (session instanceof NextResponse) return session;

  try {
    const rows = await query<Row>(
      `SELECT u.id AS user_id, 'company' AS role, cp.company_name AS org_name, cp.industry AS subtitle,
              cp.industry AS sector, NULLIF(TRIM(BOTH ', ' FROM COALESCE(cp.city, '') || ', ' || COALESCE(cp.country, '')), '') AS location
       FROM company_profiles cp JOIN users u ON u.id = cp.user_id
       WHERE u.id != $1
       UNION ALL
       SELECT u.id, 'investor', COALESCE(NULLIF(ip.organisation_name, ''), ip.investor_type), ip.investor_type,
              ip.preferred_sector, ip.country
       FROM investor_profiles ip JOIN users u ON u.id = ip.user_id
       WHERE u.id != $1
       UNION ALL
       SELECT u.id, 'government', gp.agency_name, COALESCE(NULLIF(gp.department, ''), gp.jurisdiction_level || ' agency'),
              gp.focus_area, gp.country
       FROM government_profiles gp JOIN users u ON u.id = gp.user_id
       WHERE u.id != $1
       ORDER BY org_name ASC
       LIMIT 200`,
      [session.userId]
    );

    // The viewer's own sector field, so match scoring has something to
    // compare against — general_user accounts have no sector, so they
    // simply see role-complementarity-only scores (0 unless not applicable).
    const [own] = await Promise.all([
      session.role === 'company'
        ? query<{ industry: string }>('SELECT industry FROM company_profiles WHERE user_id = $1', [session.userId])
        : session.role === 'investor'
          ? query<{ preferred_sector: string }>('SELECT preferred_sector FROM investor_profiles WHERE user_id = $1', [session.userId])
          : session.role === 'government'
            ? query<{ focus_area: string }>('SELECT focus_area FROM government_profiles WHERE user_id = $1', [session.userId])
            : Promise.resolve([])
    ]);
    const viewerSector = (own[0] as { industry?: string; preferred_sector?: string; focus_area?: string } | undefined);
    const viewerSectorText = viewerSector?.industry ?? viewerSector?.preferred_sector ?? viewerSector?.focus_area ?? '';
    const viewerRole: ConnectRole = session.role === 'company' || session.role === 'investor' || session.role === 'government' ? session.role : 'company';

    const entries: (DirectoryEntry & { score: number; label: string })[] = rows.map((r) => {
      const entry: DirectoryEntry = {
        userId: r.user_id,
        role: r.role,
        orgName: r.org_name,
        subtitle: r.subtitle ?? '',
        sector: r.sector ?? '',
        location: r.location ?? 'Unspecified'
      };
      const score = session.role === 'general_user' ? 0 : computeMatchScore({ role: viewerRole, sector: viewerSectorText }, entry);
      return { ...entry, score, label: matchLabel(score) };
    });

    entries.sort((a, b) => b.score - a.score || a.orgName.localeCompare(b.orgName));

    return NextResponse.json({ entries });
  } catch (err) {
    return handleApiError(err);
  }
}
