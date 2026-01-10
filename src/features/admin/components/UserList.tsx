'use client';

/**
 * UserList component
 *
 * Displays list of users with their status and actions.
 * Allows admins to deactivate/reactivate user accounts.
 * Implements WCAG 2.1 AA accessibility requirements.
 *
 * @see Story 2.7 - Désactivation de Compte Utilisateur (FR6)
 */

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { UserCheck, UserX, Shield, Edit3, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  toggleUserStatusAction,
  type ToggleUserStatusState,
} from '../actions/toggle-user-status.action';
import type { UserItem } from '../actions/list-users.action';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface UserListProps {
  users: UserItem[];
  currentUserId: string;
}

type RoleConfigType = {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  className: string;
};

const roleConfig = {
  ADMIN: {
    label: 'Admin',
    icon: Shield,
    className: 'text-purple-600 bg-purple-50 dark:bg-purple-900/20',
  },
  EDITOR: {
    label: 'Éditeur',
    icon: Edit3,
    className: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20',
  },
  VIEWER: {
    label: 'Lecteur',
    icon: Eye,
    className: 'text-gray-600 bg-gray-50 dark:bg-gray-900/20',
  },
} as const satisfies Record<string, RoleConfigType>;

function formatDate(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(dateObj);
}

function getRoleConfig(role: string): RoleConfigType {
  if (role === 'ADMIN' || role === 'EDITOR' || role === 'VIEWER') {
    return roleConfig[role];
  }
  return roleConfig.VIEWER;
}

function RoleBadge({ role }: { role: string }) {
  const config = getRoleConfig(role);
  const Icon = config.icon;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
        config.className
      )}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {config.label}
    </span>
  );
}

function StatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <span
      role="status"
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
        isActive
          ? 'text-green-600 bg-green-50 dark:bg-green-900/20'
          : 'text-red-600 bg-red-50 dark:bg-red-900/20'
      )}
    >
      {isActive ? (
        <>
          <UserCheck className="h-3.5 w-3.5" aria-hidden="true" />
          Actif
        </>
      ) : (
        <>
          <UserX className="h-3.5 w-3.5" aria-hidden="true" />
          Inactif
        </>
      )}
    </span>
  );
}

export function UserList({ users, currentUserId }: UserListProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);

  const handleToggleClick = (user: UserItem) => {
    setSelectedUser(user);
    setDialogOpen(true);
  };

  const handleConfirmToggle = () => {
    if (!selectedUser) return;

    startTransition(async () => {
      const result: ToggleUserStatusState = await toggleUserStatusAction(
        selectedUser.id
      );

      if (result.success) {
        toast.success(result.message);
        router.refresh();
      } else {
        toast.error(result.error);
      }

      setDialogOpen(false);
      setSelectedUser(null);
    });
  };

  if (users.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-8">
        Aucun utilisateur trouvé.
      </p>
    );
  }

  return (
    <>
      <ul
        role="list"
        aria-label="Liste des utilisateurs"
        aria-live="polite"
        className="divide-y divide-border"
      >
        {users.map((user) => {
          const isCurrentUser = user.id === currentUserId;

          return (
            <li
              key={user.id}
              className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium truncate">
                    {user.name || 'Sans nom'}
                  </p>
                  {isCurrentUser && (
                    <span className="text-xs text-muted-foreground">(vous)</span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground truncate">
                  {user.email}
                </p>
                <p className="text-sm text-muted-foreground">
                  Inscrit le {formatDate(user.createdAt)}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <RoleBadge role={user.role} />
                <StatusBadge isActive={user.isActive} />

                {!isCurrentUser && (
                  <Button
                    variant={user.isActive ? 'outline' : 'default'}
                    size="sm"
                    onClick={() => handleToggleClick(user)}
                    disabled={isPending}
                    aria-label={
                      user.isActive
                        ? `Désactiver le compte de ${user.name || user.email}`
                        : `Réactiver le compte de ${user.name || user.email}`
                    }
                  >
                    {user.isActive ? (
                      <>
                        <UserX className="h-4 w-4 mr-1" aria-hidden="true" />
                        Désactiver
                      </>
                    ) : (
                      <>
                        <UserCheck className="h-4 w-4 mr-1" aria-hidden="true" />
                        Réactiver
                      </>
                    )}
                  </Button>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {/* Confirmation Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedUser?.isActive
                ? 'Désactiver le compte'
                : 'Réactiver le compte'}
            </DialogTitle>
            <DialogDescription>
              {selectedUser?.isActive ? (
                <>
                  Êtes-vous sûr de vouloir désactiver le compte de{' '}
                  <strong>{selectedUser?.name || selectedUser?.email}</strong> ?
                  L'utilisateur ne pourra plus se connecter.
                </>
              ) : (
                <>
                  Êtes-vous sûr de vouloir réactiver le compte de{' '}
                  <strong>{selectedUser?.name || selectedUser?.email}</strong> ?
                  L'utilisateur pourra à nouveau se connecter.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={isPending}
            >
              Annuler
            </Button>
            <Button
              variant={selectedUser?.isActive ? 'destructive' : 'default'}
              onClick={handleConfirmToggle}
              disabled={isPending}
            >
              {isPending
                ? 'En cours...'
                : selectedUser?.isActive
                ? 'Désactiver'
                : 'Réactiver'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
