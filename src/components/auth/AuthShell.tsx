import Link from 'next/link';
import { Logo } from '@/components/Logo';

export function AuthShell({
  eyebrow,
  title,
  description,
  wide = false,
  children
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto grid min-h-[calc(100dvh-4rem)] w-[min(100%-2.5rem,72rem)] place-items-center py-12">
      <div className={`w-full ${wide ? 'max-w-5xl' : 'max-w-md'}`}>
        <div className="mb-8 flex flex-col items-center gap-4 text-center">
          <Link href="/">
            <Logo />
          </Link>
          <p className="text-sm text-text-2">Global Partnership Hub</p>
        </div>

        <div className="rounded-2xl border border-line bg-surface-1/90 p-6 sm:p-8">
          {eyebrow && <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-text-3">{eyebrow}</p>}
          <h1 className="mb-2 text-2xl font-semibold tracking-tight">{title}</h1>
          {description && <p className="mb-6 text-sm text-text-2">{description}</p>}
          {children}
        </div>
      </div>
    </main>
  );
}
