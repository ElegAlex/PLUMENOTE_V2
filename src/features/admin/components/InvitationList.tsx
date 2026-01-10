'use client';

/**
 * InvitationList component
 *
 * Displays list of invitations with their status and actions.
 * Implements WCAG 2.1 AA accessibility requirements.
 *
 * @see Story 2.6 - Invitation de Nouveaux Utilisateurs (FR5)
 * @see AC #7: Accessible list with proper ARIA labels
 */

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Clock, CheckCircle2, XCircle, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  cancelInvitationAction,
  type CancelInvitationState,
} from '../actions/cancel-invitation.action';
import type {
  InvitationItem,
  InvitationStatus,
} from '../actions/list-invitations.action';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface InvitationListProps {
  invitations: InvitationItem[];
}

const statusConfig: Record<
  InvitationStatus,
  {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    className: string;
  }
> = {
  pending: {
    label: 'En attente',
    icon: Clock,
    className: 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20',
  },
  used: {
    label: 'Utilisée',
    icon: CheckCircle2,
    className: 'text-green-600 bg-green-50 dark:bg-green-900/20',
  },
  expired: {
    label: 'Expirée',
    icon: XCircle,
    className: 'text-red-600 bg-red-50 dark:bg-red-900/20',
  },
};

function formatDate(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(dateObj);
}

function StatusBadge({ status }: { status: InvitationStatus }) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <span
      role="status"
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

export function InvitationList({ invitations }: InvitationListProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [invitationToCancel, setInvitationToCancel] =
    useState<InvitationItem | null>(null);

  const handleCancelClick = (invitation: InvitationItem) => {
    setInvitationToCancel(invitation);
    setCancelDialogOpen(true);
  };

  const handleConfirmCancel = () => {
    if (!invitationToCancel) return;

    startTransition(async () => {
      const result: CancelInvitationState = await cancelInvitationAction(
        invitationToCancel.id
      );

      if (result.success) {
        toast.success(result.message);
        router.refresh();
      } else {
        toast.error(result.error);
      }

      setCancelDialogOpen(false);
      setInvitationToCancel(null);
    });
  };

  if (invitations.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-8">
        Aucune invitation envoyée.
      </p>
    );
  }

  return (
    <>
      <ul
        role="list"
        aria-label="Liste des invitations"
        aria-live="polite"
        className="divide-y divide-border"
      >
        {invitations.map((invitation) => (
          <li
            key={invitation.id}
            className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0"
          >
            <div className="min-w-0 flex-1">
              <p className="font-medium truncate">{invitation.email}</p>
              <p className="text-sm text-muted-foreground">
                Invité par {invitation.invitedBy.name || invitation.invitedBy.email} le{' '}
                {formatDate(invitation.createdAt)}
              </p>
              {invitation.status === 'pending' && (
                <p className="text-sm text-muted-foreground">
                  Expire le {formatDate(invitation.expiresAt)}
                </p>
              )}
              {invitation.usedAt && (
                <p className="text-sm text-muted-foreground">
                  Utilisée le {formatDate(invitation.usedAt)}
                </p>
              )}
            </div>

            <div className="flex items-center gap-3">
              <StatusBadge status={invitation.status} />

              {invitation.status === 'pending' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCancelClick(invitation)}
                  disabled={isPending}
                  aria-label={`Annuler l'invitation pour ${invitation.email}`}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              )}
            </div>
          </li>
        ))}
      </ul>

      {/* Cancel Confirmation Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Annuler l'invitation</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir annuler l'invitation pour{' '}
              <strong>{invitationToCancel?.email}</strong> ? Cette action est
              irréversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCancelDialogOpen(false)}
              disabled={isPending}
            >
              Non, garder
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmCancel}
              disabled={isPending}
            >
              {isPending ? 'Annulation...' : 'Oui, annuler'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
