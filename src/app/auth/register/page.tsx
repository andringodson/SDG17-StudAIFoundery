import Link from 'next/link';
import { AuthShell } from '@/components/auth/AuthShell';

const ROLES = [
  {
    href: '/auth/register/company',
    icon: '🏢',
    title: 'Company / Startup',
    blurb: 'For businesses seeking investment, partnerships, and growth opportunities.',
    features: ['Create Company Profile', 'Find Investors', 'Receive Investor Matches', 'Share Pitch Materials', 'Communicate with Investors', 'Schedule Meetings'],
    cta: 'Join as Company'
  },
  {
    href: '/auth/register/investor',
    icon: '💼',
    title: 'Investor',
    blurb: 'For investors looking to discover companies and investment opportunities.',
    features: ['Create Investor Profile', 'Discover Companies', 'Receive AI-Powered Matches', 'Review Pitch Materials', 'Communicate with Companies', 'Manage Opportunities'],
    cta: 'Join as Investor'
  },
  {
    href: '/auth/register/government',
    icon: '🏛️',
    title: 'Government / Agency',
    blurb: 'For public agencies and departments coordinating aid, trade, or policy partnerships.',
    features: ['Create Agency Profile', 'Discover Businesses', 'Real-Time Partner Connect', 'Publish Focus Areas', 'Communicate with Partners', 'Track Pledges'],
    cta: 'Join as Agency'
  },
  {
    href: '/auth/register/general',
    icon: '🌍',
    title: 'General User',
    blurb: 'For users who want to explore SDG 17 projects, tools, and educational content.',
    features: ['Explore Projects', 'Use Platform Tools', 'Learn About SDG 17', 'Access Public Features'],
    cta: 'Join as Explorer'
  }
];

export default function RegisterRoleSelectPage() {
  return (
    <AuthShell title="How would you like to join?" wide>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {ROLES.map((r) => (
          <div key={r.href} className="glow-card flex flex-col rounded-xl border border-line bg-bg/40 p-5">
            <span className="text-2xl" aria-hidden="true">{r.icon}</span>
            <h2 className="mt-2 text-lg font-semibold">{r.title}</h2>
            <p className="mt-1 text-sm text-text-2">{r.blurb}</p>
            <ul className="mt-3 flex-1 space-y-1 text-xs text-text-3">
              {r.features.map((f) => (
                <li key={f} className="flex gap-1.5">
                  <span aria-hidden="true">·</span>{f}
                </li>
              ))}
            </ul>
            <Link
              href={r.href}
              className="glow-btn mt-4 flex min-h-[40px] items-center justify-center rounded-lg text-sm font-semibold"
            >
              {r.cta}
            </Link>
          </div>
        ))}
      </div>
      <p className="mt-6 text-center text-sm text-text-3">
        Already have an account?{' '}
        <Link href="/auth/login" className="font-semibold text-text underline">Log in</Link>
      </p>
    </AuthShell>
  );
}
