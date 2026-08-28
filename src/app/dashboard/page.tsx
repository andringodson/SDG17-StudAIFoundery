import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';

const ROLE_HOME: Record<string, string> = {
  company: '/dashboard/company',
  investor: '/dashboard/investor',
  government: '/dashboard/government',
  general_user: '/dashboard/general',
  admin: '/dashboard/admin',
  compliance_admin: '/dashboard/admin'
};

/** The single entry point every login/registration redirects to. Its only
 * job is to read the authenticated role and forward — nothing renders here. */
export default async function DashboardRouterPage() {
  const session = await getSession();
  if (!session) redirect('/auth/login');
  redirect(ROLE_HOME[session.role] ?? '/dashboard/general');
}
