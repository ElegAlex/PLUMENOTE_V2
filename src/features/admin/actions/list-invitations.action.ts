'use server';

/**
 * Server Action for listing invitations
 *
 * Returns all invitations with their status for the admin dashboard.
 *
 * @see Story 2.6 - Invitation de Nouveaux Utilisateurs (FR5)
 */

import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { logger } from '@/lib/logger';

/**
 * Invitation status enum
 */
export type InvitationStatus = 'pending' | 'used' | 'expired';

/**
 * Invitation item for display
 */
export type InvitationItem = {
  id: string;
  email: string;
  status: InvitationStatus;
  createdAt: Date;
  expiresAt: Date;
  usedAt: Date | null;
  invitedBy: {
    id: string;
    name: string | null;
    email: string;
  };
};

/**
 * State returned by the list invitations action
 */
export type ListInvitationsState = {
  success: boolean;
  invitations?: InvitationItem[];
  error?: string;
};

/**
 * Determine invitation status based on dates
 */
function getInvitationStatus(
  usedAt: Date | null,
  expiresAt: Date
): InvitationStatus {
  if (usedAt) return 'used';
  if (expiresAt < new Date()) return 'expired';
  return 'pending';
}

/**
 * List all invitations
 *
 * SECURITY: Only accessible by authenticated users with ADMIN role.
 *
 * @returns Object containing invitations array or error
 */
export async function listInvitationsAction(): Promise<ListInvitationsState> {
  // Verify authentication and admin role
  const session = await auth();
  if (!session?.user) {
    logger.warn('List invitations attempt without authentication');
    return {
      success: false,
      error: 'Vous devez être connecté pour voir les invitations.',
    };
  }

  if (session.user.role !== 'ADMIN') {
    logger.warn(
      { userId: session.user.id },
      'Non-admin user attempted to list invitations'
    );
    return {
      success: false,
      error: 'Seuls les administrateurs peuvent voir les invitations.',
    };
  }

  try {
    const invitations = await prisma.invitation.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        invitedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    const formattedInvitations: InvitationItem[] = invitations.map((inv) => ({
      id: inv.id,
      email: inv.email,
      status: getInvitationStatus(inv.usedAt, inv.expiresAt),
      createdAt: inv.createdAt,
      expiresAt: inv.expiresAt,
      usedAt: inv.usedAt,
      invitedBy: inv.invitedBy,
    }));

    return {
      success: true,
      invitations: formattedInvitations,
    };
  } catch (error) {
    logger.error({ error }, 'Error listing invitations');
    return {
      success: false,
      error: 'Une erreur est survenue. Veuillez réessayer.',
    };
  }
}
