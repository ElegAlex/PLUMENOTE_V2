/**
 * Dashboard Layout
 *
 * Root layout for all protected dashboard routes.
 * Requires authentication - enforced by middleware.
 *
 * @see NFR11: Authentication required for all access
 * @see Story 2.5: Page de Profil Utilisateur
 * @see Story 3.3: Raccourci Ctrl+N pour nouvelle note
 */

import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { DashboardProviders } from '@/components/providers/DashboardProviders';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  // Double-check authentication (middleware should handle this, but extra safety)
  if (!session?.user) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <DashboardProviders>
        <main>{children}</main>
      </DashboardProviders>
    </div>
  );
}
