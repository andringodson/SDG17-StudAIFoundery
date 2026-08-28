import { requireAnySession } from '@/lib/requireRole';
import { ConnectHub } from '@/components/connect/ConnectHub';
import { Logo } from '@/components/Logo';
import Link from 'next/link';

export const metadata = { title: 'Connect — SDG 17 Hub' };

/** Real-time partner connect: browse business, investor, and government
 * accounts and message them directly. Open to every signed-in role —
 * requireAnySession, not requireRole — since any account type may want to
 * reach out to a business or government partner, not just other businesses. */
export default async function ConnectPage() {
  const session = await requireAnySession();

  return (
    <div className="mx-auto flex h-[100dvh] w-[min(100%-2rem,80rem)] flex-col py-4 sm:py-6">
      <header className="mb-4 flex items-center justify-between gap-4 px-1">
        <Link href="/"><Logo /></Link>
        <Link href="/dashboard" className="tap rounded-lg border border-line px-3 py-2 text-sm font-semibold hover:bg-white/5">
          Back to dashboard
        </Link>
      </header>
      <div className="min-h-0 flex-1">
        <ConnectHub selfRole={session.role} />
      </div>
    </div>
  );
}
