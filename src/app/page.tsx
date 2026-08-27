import { FinanceSimulator } from '@/components/simulators/FinanceSimulator';
import { TradeSimulator } from '@/components/simulators/TradeSimulator';
import { CapacitySimulator } from '@/components/simulators/CapacitySimulator';
import { EcosystemBuilder } from '@/components/simulators/EcosystemBuilder';
import { PartnershipMap } from '@/components/map/PartnershipMap';
import { LivePoll } from '@/components/LivePoll';
import { PledgeWall } from '@/components/PledgeWall';
import { AuthPanel } from '@/components/AuthPanel';
import { HeroTitle } from '@/components/HeroTitle';
import { ScrollReveal } from '@/components/ScrollReveal';

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

      <footer className="mt-20 border-t border-line pt-8 text-sm text-text-3">
        <p>
          SDG 17 · Global Partnership Platform — built by the RIT StudAI Foundery team. Datasets are illustrative;
          this is a teaching and advocacy tool, not an official UN data source.
        </p>
        <p className="mt-2 text-xs text-text-3/70">A Project by Error404</p>
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
