import { FinanceSimulator } from '@/components/simulators/FinanceSimulator';
import { TradeSimulator } from '@/components/simulators/TradeSimulator';
import { CapacitySimulator } from '@/components/simulators/CapacitySimulator';
import { EcosystemBuilder } from '@/components/simulators/EcosystemBuilder';
import { PartnershipMap } from '@/components/map/PartnershipMap';
import { LivePoll } from '@/components/LivePoll';
import { PledgeWall } from '@/components/PledgeWall';
import { AuthPanel } from '@/components/AuthPanel';
import Link from 'next/link';
import { HeroTitle } from '@/components/HeroTitle';
import { ScrollReveal } from '@/components/ScrollReveal';
import { Logo } from '@/components/Logo';

const STATS = [
  { n: '01', label: 'Active projects', value: '5,830' },
  { n: '02', label: 'Partner organisations', value: '1,331' },
  { n: '03', label: 'Committed funding', value: '₹13,600 Cr' }
];

export default function HomePage() {
  return (
    <main id="main" className="mx-auto w-[min(100%-2.5rem,72rem)] pb-32 pt-7 sm:pt-8">
      {/* HERO — bold headline, numbered stat callouts (metacci/nbnzia-inspired) */}
      <section className="grid gap-7 pb-10 pt-14 sm:pb-12 sm:pt-20">
        <p className="hero-eyebrow inline-flex w-fit items-center gap-3 text-xs font-bold uppercase tracking-[0.16em] text-text-3">
          <span className="num-badge hero-eyebrow__number h-10 w-10 text-lg">17</span>
          <span>United Nations Sustainable Development Goal</span>
        </p>
        <HeroTitle />
        <p className="max-w-[62ch] text-lg text-text-2 sm:text-xl">
          Explore how collaboration in finance, technology, skills, trade, and policy can accelerate sustainable development.
          All figures in Indian Rupees.
        </p>
        <div className="flex flex-wrap gap-3">
          <a href="#finance" className="glow-btn inline-flex min-h-[52px] items-center justify-center rounded-lg px-6 text-lg font-bold">
            Explore SDG 17
          </a>
          <a href="#builder" className="interactive-outline inline-flex min-h-[52px] items-center justify-center rounded-lg border border-line-strong px-6 text-lg font-medium text-text">
            Build a partnership
          </a>
        </div>

        <dl className="hero-stats mt-8 grid gap-6 pt-6 sm:grid-cols-3 sm:gap-0">
          {STATS.map((s) => (
            <div key={s.n} className="hero-stat">
              <dd className="hero-stat__value text-4xl font-semibold">{s.value}</dd>
              <dt className="mt-1 text-sm text-text-3">{s.label}</dt>
            </div>
          ))}
        </dl>
        <p className="text-xs text-text-3">
          Illustrative figures for demonstration — not official UN data.
        </p>
      </section>

      {/* PROBLEM STATEMENT — grounds the platform in two concrete SDG 17
          failure modes rather than the goal's abstract five pillars, and
          points each one at the tool built to address it. */}
      <Section id="why" eyebrow="Why this exists" title="Two problems this platform targets">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="glow-card rounded-xl border border-line bg-bg/40 p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-text-3">Problem 1 — Partner discovery</p>
            <p className="mt-2 text-sm text-text-2">
              Businesses, investors, and government agencies working toward the same SDG 17 targets often have no
              searchable way to find each other — funding earmarked for multi-stakeholder partnerships (targets
              17.16–17.17) goes unspent simply because the right parties never learn the others exist.
            </p>
            <a href="#map" className="tap mt-3 inline-block text-sm font-semibold underline">See the partnership map →</a>
          </div>
          <div className="glow-card rounded-xl border border-line bg-bg/40 p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-text-3">Problem 2 — Slow coordination</p>
            <p className="mt-2 text-sm text-text-2">
              Once a match is found, coordinating across time zones and departments over email adds months of delay
              to mobilising finance or technology transfer (targets 17.3, 17.6–17.7), with no shared record of what
              was agreed.
            </p>
            <Link href="/connect" className="tap mt-3 inline-block text-sm font-semibold underline">Open real-time Connect →</Link>
          </div>
        </div>
      </Section>

      {/* MAP */}
      <Section id="map" eyebrow="Where the work happens" title="Global partnership map">
        <PartnershipMap />
      </Section>

      {/* FINANCE */}
      <Section id="finance" eyebrow="Target 17.1 – 17.5" title="Finance impact simulator">
        <FinanceSimulator />
      </Section>

      {/* TRADE */}
      <Section id="trade" eyebrow="Target 17.10 – 17.12" title="Fair trade impact simulator">
        <TradeSimulator />
      </Section>

      {/* CAPACITY */}
      <Section id="capacity" eyebrow="Target 17.9, 17.18 – 17.19" title="Capacity building skill simulator">
        <CapacitySimulator />
      </Section>

      {/* ECOSYSTEM BUILDER */}
      <Section id="builder" eyebrow="Target 17.16 – 17.17" title="Build your partnership">
        <EcosystemBuilder />
      </Section>

      {/* ACTION CENTRE */}
      <Section id="action" eyebrow="Your turn" title="Action centre">
        <div className="grid gap-6 lg:grid-cols-2">
          <AuthPanel />
          <LivePoll />
        </div>
        <div className="mt-6">
          <PledgeWall />
        </div>
      </Section>

      {/* Three columns on desktop, stacked on mobile: identity, where to go,
          what this is. The disclaimer is given its own line rather than
          buried mid-paragraph — the figures on this site are invented, and
          that should be findable, not skimmed past. */}
      <footer className="mt-24 border-t border-line pt-10">
        <div className="grid gap-8 sm:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <Logo />
            <p className="mt-3 max-w-[38ch] text-sm text-text-3">
              A teaching and advocacy tool for exploring how partnership accelerates the
              Sustainable Development Goals.
            </p>
          </div>

          <nav aria-label="Explore">
            <h2 className="text-xs font-medium uppercase tracking-[0.14em] text-text-3">Explore</h2>
            <ul className="mt-3 grid gap-2 text-sm">
              <li><a href="#map" className="text-text-2 hover:text-text">Partnership map</a></li>
              <li><a href="#finance" className="text-text-2 hover:text-text">Finance simulator</a></li>
              <li><a href="#trade" className="text-text-2 hover:text-text">Trade simulator</a></li>
              <li><a href="#builder" className="text-text-2 hover:text-text">Partnership builder</a></li>
            </ul>
          </nav>

          <nav aria-label="Account and support">
            <h2 className="text-xs font-medium uppercase tracking-[0.14em] text-text-3">Account</h2>
            <ul className="mt-3 grid gap-2 text-sm">
              <li><Link href="/auth" className="text-text-2 hover:text-text">Sign in</Link></li>
              <li><Link href="/auth/register" className="text-text-2 hover:text-text">Create account</Link></li>
              <li><Link href="/connect" className="text-text-2 hover:text-text">Connect with partners</Link></li>
              <li><Link href="/support" className="text-text-2 hover:text-text">Report an issue</Link></li>
            </ul>
          </nav>
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t border-line pt-6 text-xs text-text-3">
          <p>SDG 17 · Global Partnership Platform — built by the RIT StudAI Foundery team.</p>
          <p className="text-text-3/70">A Project by Error404</p>
        </div>
        <p className="mt-3 text-xs text-text-3/70">
          Figures shown across this site are illustrative demonstration data, not official UN statistics.
        </p>
      </footer>
    </main>
  );
}

function Section({ id, eyebrow, title, children }: { id: string; eyebrow: string; title: string; children: React.ReactNode }) {
  return (
    <ScrollReveal id={id}>
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-text-3">{eyebrow}</p>
      <h2 className="mb-6 text-3xl font-medium tracking-tight sm:text-4xl">{title}</h2>
      {children}
    </ScrollReveal>
  );
}
