import Link from 'next/link';
import { AuthShell } from '@/components/auth/AuthShell';

export default function AccessRestrictedPage() {
  return (
    <AuthShell title="Access Restricted" description="You do not have permission to access this area.">
      <Link href="/dashboard" className="glow-btn flex min-h-[44px] items-center justify-center rounded-lg font-semibold">
        Return to Dashboard
      </Link>
    </AuthShell>
  );
}
