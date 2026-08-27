import Link from 'next/link';
import { Logo } from '@/components/Logo';

export default function AuthLandingPage() {
  return (
    <main className="mx-auto grid min-h-[calc(100dvh-4rem)] w-[min(100%-2.5rem,64rem)] place-items-center py-12">
      <div className="w-full max-w-lg text-center">
        <div className="mb-3 flex justify-center">
          <Logo />
        </div>
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-text-3">
          SDG 17 — Partnerships for the Goals
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
          Company–Investor Partnership Hub
        </h1>
        <p className="mx-auto mt-4 max-w-md text-text-2">
          Connect. Collaborate. Invest. Build sustainable partnerships for the future.
        </p>

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <Link
            href="/auth/login"
            className="glow-btn flex min-h-[48px] items-center justify-center rounded-lg font-semibold"
          >
            Log In
          </Link>
          <Link
            href="/auth/register"
            className="flex min-h-[48px] items-center justify-center rounded-lg border border-line-strong font-semibold transition hover:border-text hover:bg-white/5"
          >
            Create Account
          </Link>
        </div>

        <p className="mt-8 text-xs text-text-3">
          <Link href="/" className="underline hover:text-text-2">
            ← Back to the platform
          </Link>
        </p>
      </div>
    </main>
  );
}
