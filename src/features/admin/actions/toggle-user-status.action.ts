'use server';

/**
 * Server Action for toggling user active status
 *
 * Allows admins to deactivate or reactivate user accounts.
 * Deactivated users cannot log in but their data is preserved.
 *
 * @see Story 2.7 - Désactivation de Compte Utilisateur (FR6)
 */

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { logger } from '@/lib/logger';

/**
 * State returned by the toggle user status action
 */
export type ToggleUserStatusState = {
  success: boolean;
  message?: string;
  error?: string;
  newStatus?: boolean;
};

/**
 * Toggle user active status (deactivate/reactivate)
 *
 * SECURITY: Only accessible by authenticated users with ADMIN role.
 * Admins cannot deactivate their own account.
 *
 * @param userId - The ID of the user to toggle
 * @returns Result with success/error information
 */
export async function toggleUserStatusAction(
  userId: string
): Promise<ToggleUserStatusState> {
  // Verify authentication and admin role
  const session = await auth();
  if (!session?.user) {
    logger.warn('Toggle user status attempt without authentication');
    return {
      success: false,
      error: 'Vous devez être connecté pour modifier le statut d\'un utilisateur.',
    };
  }

  if (session.user.role !== 'ADMIN') {
    logger.warn(
      { userId: session.user.id },
      'Non-admin user attempted to toggle user status'
    );
    return {
      success: false,
      error: 'Seuls les administrateurs peuvent modifier le statut des utilisateurs.',
    };
  }

  // Validate user ID
  if (!userId || typeof userId !== 'string') {
    return {
      success: false,
      error: 'Identifiant utilisateur invalide.',
    };
  }

  // Prevent admin from deactivating their own account
  if (userId === session.user.id) {
    logger.warn(
      { adminId: session.user.id },
      'Admin attempted to deactivate own account'
    );
    return {
      success: false,
      error: 'Vous ne pouvez pas désactiver votre propre compte.',
    };
  }

  try {
    // Find the user
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, isActive: true, name: true },
    });

    if (!user) {
      return {
        success: false,
        error: 'Utilisateur introuvable.',
      };
    }

    // Toggle the status
    const newStatus = !user.isActive;
    await prisma.user.update({
      where: { id: userId },
      data: { isActive: newStatus },
    });

    const action = newStatus ? 'réactivé' : 'désactivé';
    logger.info(
      { adminId: session.user.id, targetUserId: userId, newStatus },
      `User account ${action}`
    );

    // Revalidate the admin users page
    revalidatePath('/admin/users');

    return {
      success: true,
      message: `Le compte de ${user.name || user.email} a été ${action}.`,
      newStatus,
    };
  } catch (error) {
    logger.error({ error, userId }, 'Error toggling user status');
    return {
      success: false,
      error: 'Une erreur est survenue. Veuillez réessayer.',
    };
  }
}
