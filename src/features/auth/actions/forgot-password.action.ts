'use server';

/**
 * Server Action for password reset request
 *
 * Handles the "forgot password" flow:
 * 1. Validate email format
 * 2. Check if user exists (without revealing this to client)
 * 3. Generate secure reset token
 * 4. Store hashed token in database
 * 5. Send reset email
 *
 * SECURITY: Always returns same success message regardless of
 * whether the email exists to prevent email enumeration attacks.
 *
 * @see Story 2.4 - Réinitialisation de Mot de Passe (FR3)
 * @see OWASP Forgot Password Cheat Sheet
 *
 * @tech-debt RATE_LIMITING - MVP does not implement rate limiting.
 *   Production should add rate limiting (e.g., 5 requests per IP per hour)
 *   to prevent:
 *   - API abuse (bcrypt token generation is CPU-intensive)
 *   - Email spam (if email exists)
 *   - Resource exhaustion
 *   Consider: express-rate-limit, upstash/ratelimit, or custom Redis-based limiter
 */

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { emailService } from '@/lib/email';
import { generateResetToken } from '@/lib/token';
import {
  forgotPasswordSchema,
  type ForgotPasswordFormData,
} from '../schemas/forgot-password.schema';

/**
 * State returned by the forgot password action
 */
export type ForgotPasswordState = {
  success: boolean;
  message?: string;
  error?: string;
  fieldErrors?: Partial<Record<keyof ForgotPasswordFormData, string[]>>;
};

/**
 * Token expiration time in milliseconds (1 hour)
 */
const TOKEN_EXPIRATION_MS = 60 * 60 * 1000;

/**
 * Request a password reset
 *
 * SECURITY NOTE: This action ALWAYS returns a success message after
 * validation passes, regardless of whether the email exists in the
 * database. This prevents attackers from enumerating valid emails.
 *
 * @param prevState - Previous form state (for useActionState)
 * @param formData - Form data containing email
 * @returns Updated state with success/error information
 */
export async function forgotPasswordAction(
  prevState: ForgotPasswordState,
  formData: FormData
): Promise<ForgotPasswordState> {
  // Extract and normalize email
  const rawEmail = formData.get('email');
  const normalizedEmail =
    typeof rawEmail === 'string' ? rawEmail.trim().toLowerCase() : '';

  // Server-side validation with Zod
  const result = forgotPasswordSchema.safeParse({ email: normalizedEmail });
  if (!result.success) {
    return {
      success: false,
      error: 'Données invalides',
      fieldErrors: result.error.flatten()
        .fieldErrors as Partial<Record<keyof ForgotPasswordFormData, string[]>>,
    };
  }

  const { email } = result.data;

  try {
    // Check if user exists and is active
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, isActive: true },
    });

    if (user && user.isActive) {
      // Delete any existing reset tokens for this email
      await prisma.passwordResetToken.deleteMany({
        where: { email },
      });

      // Generate secure token
      const { token, hashedToken, tokenPrefix } = await generateResetToken();

      // Store hashed token in database with prefix for fast lookup
      await prisma.passwordResetToken.create({
        data: {
          token: hashedToken,
          tokenPrefix,
          email,
          expiresAt: new Date(Date.now() + TOKEN_EXPIRATION_MS),
        },
      });

      // Build reset URL
      const baseUrl =
        process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const resetUrl = `${baseUrl}/reset-password?token=${token}`;

      // Send reset email
      await emailService.sendPasswordResetEmail(email, resetUrl);

      logger.info({ email }, 'Password reset email sent');
    } else {
      // Log for monitoring but don't reveal to client
      logger.info(
        { email },
        'Password reset requested for non-existent or inactive user'
      );
    }

    // ALWAYS return success message (security: no email enumeration)
    return {
      success: true,
      message:
        'Si un compte existe avec cet email, vous recevrez un lien de réinitialisation.',
    };
  } catch (error) {
    logger.error({ email, error }, 'Error in forgot password action');
    return {
      success: false,
      error: 'Une erreur est survenue. Veuillez réessayer.',
    };
  }
}
