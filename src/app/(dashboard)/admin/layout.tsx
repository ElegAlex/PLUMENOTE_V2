/**
 * Admin Layout
 *
 * Layout for all admin routes.
 * Requires ADMIN role - redirects non-admin users to dashboard.
 *
 * @see Story 2.6 - Invitation de Nouveaux Utilisateurs (FR5)
 * @see Story 7.3 - Gestion des Templates d'Equipe (FR34)
 */

import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { AdminNav } from './AdminNav';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  // Verify admin role
  if (session?.user?.role !== 'ADMIN') {
    redirect('/dashboard');
  }

  return (
    <div className="container max-w-4xl py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Administration</h1>
        <p className="text-muted-foreground">
          Gerez les utilisateurs, invitations et templates
        </p>
      </div>
      <AdminNav />
      <div className="mt-6">
        {children}
      </div>
    </div>
  );
}
