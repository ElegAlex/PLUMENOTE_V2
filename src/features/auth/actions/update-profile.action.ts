'use server';

/**
 * Server Action for profile update
 *
 * Handles form submission, validation, and database update for user profile.
 * Requires authentication.
 *
 * @see Story 2.5: Page de Profil Utilisateur (FR4)
 * @see AC #1: Modify name with toast confirmation
 */

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { updateProfileSchema, type UpdateProfileFormData } from '../schemas/profile.schema';
import { revalidatePath } from 'next/cache';

/**
 * State returned by the updateProfile action
 */
export type UpdateProfileState = {
  success: boolean;
  message?: string;
  error?: string;
  fieldErrors?: Partial<Record<keyof UpdateProfileFormData, string[]>>;
};

/**
 * Update user profile information
 *
 * @param prevState - Previous form state (for useActionState)
 * @param formData - Form data from submission
 * @returns Updated state with success/error information
 */
export async function updateProfileAction(
  prevState: UpdateProfileState,
  formData: FormData
): Promise<UpdateProfileState> {
  // Check authentication
  const session = await auth();

  if (!session?.user?.id) {
    return {
      success: false,
      error: 'Vous devez etre connecte pour modifier votre profil.',
    };
  }

  // Extract and validate data
  const rawName = formData.get('name') as string | null;
  const result = updateProfileSchema.safeParse({ name: rawName });

  if (!result.success) {
    return {
      success: false,
      error: 'Donnees invalides',
      fieldErrors: result.error.flatten().fieldErrors as Partial<
        Record<keyof UpdateProfileFormData, string[]>
      >,
    };
  }

  // Normalize empty string to null for database
  const nameToStore = result.data.name && result.data.name.length > 0
    ? result.data.name
    : null;

  try {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { name: nameToStore },
    });

    logger.info({ userId: session.user.id }, 'Profile updated');

    // Revalidate affected paths
    revalidatePath('/settings/profile');
    revalidatePath('/'); // Revalidate header with user avatar/name

    return {
      success: true,
      message: 'Profil mis a jour avec succes.',
    };
  } catch (error) {
    logger.error({ userId: session.user.id, error }, 'Error updating profile');
    return {
      success: false,
      error: 'Une erreur est survenue. Veuillez reessayer.',
    };
  }
}
