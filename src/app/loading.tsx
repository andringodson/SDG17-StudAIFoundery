import { LogoMark } from '@/components/Logo';

/**
 * Next.js App Router special file — rendered automatically while the route
 * segment (and any async server work in it) is loading. Kept dependency-free
 * since it can appear before the rest of the JS bundle finishes.
 *
 * Deliberately restrained: a loading screen is seen for a few hundred
 * milliseconds, so it should read as the product settling rather than as its
 * own piece of design. The mark, the name, and one thin determinate-looking
 * bar — no gradient sweep, no bold weights, nothing that flashes.
 */
export default function Loading() {
  return (
    <div className="grid min-h-dvh place-items-center bg-bg px-6">
      <div className="grid w-full max-w-xs justify-items-center gap-6 text-center">
        <LogoMark size={44} animated />

        <div className="grid gap-1.5">
          <p className="text-sm font-medium tracking-tight text-text">SDG 17 Partnership Platform</p>
          <p className="text-xs text-text-3" role="status">Loading</p>
        </div>

        <div className="h-px w-full overflow-hidden bg-white/10" aria-hidden="true">
          <span className="loading-sweep block h-full w-1/3 bg-text/70" />
        </div>

        <p className="text-[0.68rem] tracking-wide text-text-3/60">A Project by Error404</p>
      </div>
    </div>
  );
}
