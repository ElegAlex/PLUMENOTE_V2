'use server';

/**
 * Server Action for avatar deletion
 *
 * Handles file deletion and database update for removing user avatars.
 * Requires authentication.
 *
 * @see Story 2.5: Page de Profil Utilisateur (FR4)
 * @see AC #4: Delete avatar
 */

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { fileStorage } from '@/lib/file-storage';
import { revalidatePath } from 'next/cache';

/**
 * State returned by the deleteAvatar action
 */
export type DeleteAvatarState = {
  success: boolean;
  error?: string;
};

/**
 * Delete the avatar for the authenticated user
 *
 * @param prevState - Previous form state (for useActionState)
 * @returns Updated state with success/error information
 */
export async function deleteAvatarAction(
  prevState: DeleteAvatarState
): Promise<DeleteAvatarState> {
  // Check authentication
  const session = await auth();

  if (!session?.user?.id) {
    return {
      success: false,
      error: 'Vous devez etre connecte pour supprimer votre avatar.',
    };
  }

  try {
    // Get current user to check for existing avatar
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { avatar: true },
    });

    // Check if user has an avatar to delete
    if (!user?.avatar) {
      return {
        success: false,
        error: 'Aucun avatar a supprimer.',
      };
    }

    // Delete the avatar file
    const path = user.avatar.replace('/uploads/', '');
    await fileStorage.delete(path);

    // Update database to remove avatar reference
    await prisma.user.update({
      where: { id: session.user.id },
      data: { avatar: null },
    });

    logger.info({ userId: session.user.id }, 'Avatar deleted');

    // Revalidate affected paths
    revalidatePath('/settings/profile');
    revalidatePath('/'); // Revalidate header with user avatar

    return {
      success: true,
    };
  } catch (error) {
    logger.error({ userId: session.user.id, error }, 'Error deleting avatar');
    return {
      success: false,
      error: 'Une erreur est survenue lors de la suppression.',
    };
  }
}
