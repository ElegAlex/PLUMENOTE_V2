/**
 * Dashboard Layout
 *
 * Root layout for all protected dashboard routes.
 * Requires authentication - enforced by middleware.
 *
 * @see NFR11: Authentication required for all access
 * @see Story 2.5: Page de Profil Utilisateur
 * @see Story 3.3: Raccourci Ctrl+N pour nouvelle note
 * @see Story 5.2: Création et Gestion des Dossiers
 */

import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
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
        <div className="flex h-[calc(100vh-3.5rem)]">
          <Sidebar />
          <main className="flex-1 overflow-y-auto">{children}</main>
        </div>
      </DashboardProviders>
    </div>
  );
}
