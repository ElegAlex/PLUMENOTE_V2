'use server';

/**
 * Server Action for avatar upload
 *
 * Handles file validation, storage, and database update for user avatars.
 * Requires authentication.
 *
 * @see Story 2.5: Page de Profil Utilisateur (FR4)
 * @see AC #2: Upload avatar (JPG/PNG, max 2MB)
 * @see AC #5: Reject non JPG/PNG files
 * @see AC #6: Reject files > 2MB
 */

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { fileStorage } from '@/lib/file-storage';
import { revalidatePath } from 'next/cache';

/**
 * Maximum file size for avatar uploads (2MB)
 */
const MAX_FILE_SIZE = 2 * 1024 * 1024;

/**
 * Accepted MIME types for avatar uploads
 */
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png'];

/**
 * State returned by the uploadAvatar action
 */
export type UploadAvatarState = {
  success: boolean;
  avatarUrl?: string;
  error?: string;
};

/**
 * Upload a new avatar for the authenticated user
 *
 * @param prevState - Previous form state (for useActionState)
 * @param formData - Form data containing the avatar file
 * @returns Updated state with success/error information
 */
export async function uploadAvatarAction(
  prevState: UploadAvatarState,
  formData: FormData
): Promise<UploadAvatarState> {
  // Check authentication
  const session = await auth();

  if (!session?.user?.id) {
    return {
      success: false,
      error: 'Vous devez etre connecte pour uploader un avatar.',
    };
  }

  // Get the file from form data
  const file = formData.get('avatar') as File | null;

  // Validate file existence
  if (!file || file.size === 0) {
    return {
      success: false,
      error: 'Aucun fichier selectionne.',
    };
  }

  // Validate file type (AC #5)
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    return {
      success: false,
      error: 'Format non supporte (JPG, PNG uniquement)',
    };
  }

  // Validate file size (AC #6)
  if (file.size > MAX_FILE_SIZE) {
    return {
      success: false,
      error: 'Le fichier ne doit pas depasser 2MB',
    };
  }

  try {
    // Get current user to check for existing avatar
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { avatar: true },
    });

    // Delete old avatar if exists
    if (user?.avatar) {
      const oldPath = user.avatar.replace('/uploads/', '');
      await fileStorage.delete(oldPath);
    }

    // Generate unique filename using userId and timestamp
    const ext = file.type === 'image/png' ? 'png' : 'jpg';
    const filename = `${session.user.id}-${Date.now()}.${ext}`;
    const path = `avatars/${filename}`;

    // Convert file to buffer and save
    const buffer = Buffer.from(await file.arrayBuffer());
    await fileStorage.save(path, buffer);

    // Update database with new avatar URL
    const avatarUrl = `/uploads/${path}`;
    await prisma.user.update({
      where: { id: session.user.id },
      data: { avatar: avatarUrl },
    });

    logger.info({ userId: session.user.id, path }, 'Avatar uploaded');

    // Revalidate affected paths
    revalidatePath('/settings/profile');
    revalidatePath('/'); // Revalidate header with user avatar

    return {
      success: true,
      avatarUrl,
    };
  } catch (error) {
    logger.error({ userId: session.user.id, error }, 'Error uploading avatar');
    return {
      success: false,
      error: "Une erreur est survenue lors de l'upload.",
    };
  }
}
