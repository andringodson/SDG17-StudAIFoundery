import { LogoMark } from '@/components/Logo';

/**
 * Next.js App Router special file — rendered automatically while the route
 * segment (and any async server work in it) is loading. Kept dependency-free
 * since it can appear before the rest of the JS bundle finishes.
 */
export default function Loading() {
  return (
    <div className="grid min-h-dvh place-items-center bg-bg px-6">
      <div className="grid justify-items-center gap-5 text-center">
        <LogoMark size={56} animated />
        <div>
          <p className="text-lg font-extrabold tracking-tight">SDG 17 Partnership Platform</p>
          <p className="text-sm text-text-3">Loading the hub…</p>
        </div>
        <div className="h-1.5 w-48 overflow-hidden rounded-full bg-white/10" role="status" aria-label="Loading">
          <span className="loading-sweep block h-full w-1/3 rounded-full bg-gradient-to-r from-white/50 to-white" />
        </div>
        <p className="text-xs text-text-3/70">A Project by Error404</p>
      </div>
    </div>
  );
}
