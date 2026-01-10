'use server';

/**
 * Server Action for password reset completion
 *
 * Handles the actual password reset:
 * 1. Validate new password format
 * 2. Verify reset token (compare hash)
 * 3. Check token expiration
 * 4. Update user password
 * 5. Delete used token (single-use)
 *
 * @see Story 2.4 - Réinitialisation de Mot de Passe (FR3)
 * @see OWASP Forgot Password Cheat Sheet
 */

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { hashPassword } from '@/lib/password';
import { verifyResetToken, getTokenPrefix } from '@/lib/token';
import {
  resetPasswordSchema,
  type ResetPasswordFormData,
} from '../schemas/reset-password.schema';

/**
 * State returned by the reset password action
 */
export type ResetPasswordState = {
  success: boolean;
  error?: string;
  fieldErrors?: Partial<Record<keyof ResetPasswordFormData, string[]>>;
};

/**
 * Reset a user's password using a reset token
 *
 * @param prevState - Previous form state (for useActionState)
 * @param formData - Form data containing token, password, and confirmPassword
 * @returns Updated state with success/error information
 */
export async function resetPasswordAction(
  prevState: ResetPasswordState,
  formData: FormData
): Promise<ResetPasswordState> {
  // Extract form data
  const rawData = {
    token: formData.get('token') as string,
    password: formData.get('password') as string,
    confirmPassword: formData.get('confirmPassword') as string,
  };

  // Server-side validation with Zod
  const result = resetPasswordSchema.safeParse(rawData);
  if (!result.success) {
    return {
      success: false,
      error: 'Données invalides',
      fieldErrors: result.error.flatten()
        .fieldErrors as Partial<Record<keyof ResetPasswordFormData, string[]>>,
    };
  }

  const { token, password } = result.data;

  try {
    // Extract prefix for fast indexed lookup (O(1) instead of O(n))
    const tokenPrefix = getTokenPrefix(token);

    // Find token by prefix (fast indexed lookup)
    const storedToken = await prisma.passwordResetToken.findUnique({
      where: {
        tokenPrefix,
      },
    });

    // Check if token exists and is not expired
    if (!storedToken || storedToken.expiresAt < new Date()) {
      logger.warn(
        { tokenPrefix },
        'Invalid or expired reset token attempted'
      );
      return {
        success: false,
        error: 'Ce lien de réinitialisation est invalide ou a expiré.',
      };
    }

    // Verify token hash (security: prevents timing attacks)
    const isValidToken = await verifyResetToken(token, storedToken.token);
    if (!isValidToken) {
      logger.warn(
        { tokenPrefix },
        'Token prefix matched but hash verification failed'
      );
      return {
        success: false,
        error: 'Ce lien de réinitialisation est invalide ou a expiré.',
      };
    }

    const matchedToken = storedToken;

    // Find the user associated with this token
    const user = await prisma.user.findUnique({
      where: { email: matchedToken.email },
      select: { id: true, email: true, isActive: true },
    });

    if (!user) {
      logger.warn(
        { email: matchedToken.email },
        'Reset token used for non-existent user'
      );
      return {
        success: false,
        error: 'Ce compte n\'existe pas.',
      };
    }

    if (!user.isActive) {
      logger.warn(
        { email: matchedToken.email },
        'Reset token used for inactive user'
      );
      return {
        success: false,
        error: 'Ce compte a été désactivé.',
      };
    }

    // Hash the new password
    const hashedPassword = await hashPassword(password);

    // Update user password and delete token in a transaction
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword },
      }),
      prisma.passwordResetToken.delete({
        where: { id: matchedToken.id },
      }),
    ]);

    logger.info(
      { email: user.email },
      'Password reset completed successfully'
    );

    return { success: true };
  } catch (error) {
    logger.error({ error }, 'Error in reset password action');
    return {
      success: false,
      error: 'Une erreur est survenue. Veuillez réessayer.',
    };
  }
}
