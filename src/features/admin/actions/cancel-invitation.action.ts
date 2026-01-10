'use server';

/**
 * Server Action for canceling an invitation
 *
 * Deletes a pending invitation from the database.
 *
 * @see Story 2.6 - Invitation de Nouveaux Utilisateurs (FR5)
 */

import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { logger } from '@/lib/logger';

/**
 * State returned by the cancel invitation action
 */
export type CancelInvitationState = {
  success: boolean;
  message?: string;
  error?: string;
};

/**
 * Cancel a pending invitation
 *
 * SECURITY: Only accessible by authenticated users with ADMIN role.
 * Can only cancel pending invitations (not used ones).
 *
 * @param invitationId - The ID of the invitation to cancel
 * @returns Updated state with success/error information
 */
export async function cancelInvitationAction(
  invitationId: string
): Promise<CancelInvitationState> {
  // Verify authentication and admin role
  const session = await auth();
  if (!session?.user) {
    logger.warn('Cancel invitation attempt without authentication');
    return {
      success: false,
      error: 'Vous devez être connecté pour annuler une invitation.',
    };
  }

  if (session.user.role !== 'ADMIN') {
    logger.warn(
      { userId: session.user.id },
      'Non-admin user attempted to cancel invitation'
    );
    return {
      success: false,
      error: 'Seuls les administrateurs peuvent annuler des invitations.',
    };
  }

  // Validate invitationId
  if (!invitationId || typeof invitationId !== 'string') {
    return {
      success: false,
      error: 'ID d\'invitation invalide.',
    };
  }

  try {
    // Find the invitation
    const invitation = await prisma.invitation.findUnique({
      where: { id: invitationId },
      select: { id: true, email: true, usedAt: true },
    });

    if (!invitation) {
      return {
        success: false,
        error: 'Invitation introuvable.',
      };
    }

    // Check if invitation has already been used
    if (invitation.usedAt) {
      return {
        success: false,
        error: 'Cette invitation a déjà été utilisée et ne peut pas être annulée.',
      };
    }

    // Delete the invitation
    await prisma.invitation.delete({
      where: { id: invitationId },
    });

    logger.info(
      { invitationId, email: invitation.email, canceledBy: session.user.id },
      'Invitation canceled'
    );

    return {
      success: true,
      message: `Invitation pour ${invitation.email} annulée.`,
    };
  } catch (error) {
    logger.error({ invitationId, error }, 'Error canceling invitation');
    return {
      success: false,
      error: 'Une erreur est survenue. Veuillez réessayer.',
    };
  }
}
