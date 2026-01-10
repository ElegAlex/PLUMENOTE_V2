/**
 * Admin Users Page
 *
 * Allows admins to manage users, invitations, and account status.
 *
 * @see Story 2.6 - Invitation de Nouveaux Utilisateurs (FR5)
 * @see Story 2.7 - Désactivation de Compte Utilisateur (FR6)
 */

import { Suspense } from 'react';
import { auth } from '@/lib/auth';
import { listInvitationsAction } from '@/features/admin/actions/list-invitations.action';
import { listUsersAction } from '@/features/admin/actions/list-users.action';
import { InvitationForm } from '@/features/admin/components/InvitationForm';
import { InvitationList } from '@/features/admin/components/InvitationList';
import { UserList } from '@/features/admin/components/UserList';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export const metadata = {
  title: 'Gestion des Utilisateurs | PlumeNote Admin',
  description: 'Invitez de nouveaux utilisateurs et gérez les invitations en cours.',
};

function ListSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
          <div className="space-y-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-32" />
          </div>
          <Skeleton className="h-8 w-20" />
        </div>
      ))}
    </div>
  );
}

async function InvitationListWrapper() {
  const result = await listInvitationsAction();

  if (!result.success || !result.invitations) {
    return (
      <div
        role="alert"
        className="rounded-md bg-destructive/10 p-4 text-sm text-destructive"
      >
        {result.error || 'Impossible de charger les invitations.'}
      </div>
    );
  }

  return <InvitationList invitations={result.invitations} />;
}

async function UserListWrapper() {
  const [session, result] = await Promise.all([
    auth(),
    listUsersAction(),
  ]);

  if (!result.success || !result.users) {
    return (
      <div
        role="alert"
        className="rounded-md bg-destructive/10 p-4 text-sm text-destructive"
      >
        {result.error || 'Impossible de charger les utilisateurs.'}
      </div>
    );
  }

  return (
    <UserList
      users={result.users}
      currentUserId={session?.user?.id || ''}
    />
  );
}

export default function AdminUsersPage() {
  return (
    <div className="space-y-8">
      {/* User List Card */}
      <Card>
        <CardHeader>
          <CardTitle>Utilisateurs</CardTitle>
          <CardDescription>
            Liste de tous les utilisateurs avec leur rôle et statut.
            Vous pouvez désactiver ou réactiver les comptes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<ListSkeleton />}>
            <UserListWrapper />
          </Suspense>
        </CardContent>
      </Card>

      {/* Invitation Form Card */}
      <Card>
        <CardHeader>
          <CardTitle>Inviter un utilisateur</CardTitle>
          <CardDescription>
            Envoyez une invitation par email pour permettre à un nouveau membre de rejoindre PlumeNote.
            L'invitation est valable 7 jours.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <InvitationForm />
        </CardContent>
      </Card>

      {/* Invitation List Card */}
      <Card>
        <CardHeader>
          <CardTitle>Invitations envoyées</CardTitle>
          <CardDescription>
            Liste de toutes les invitations avec leur statut actuel.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<ListSkeleton />}>
            <InvitationListWrapper />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
