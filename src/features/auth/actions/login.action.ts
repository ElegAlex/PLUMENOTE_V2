'use server';

/**
 * Server Action for user login
 *
 * Handles form submission, validation, and authentication.
 * Uses Auth.js signIn for session management.
 *
 * @see NFR13: Sessions JWT with 24h expiration
 * @see AC #3: Generic error message for security (no email enumeration)
 */

import { signIn } from '@/lib/auth';
import { AuthError } from 'next-auth';
import { logger } from '@/lib/logger';
import { loginSchema, type LoginFormData } from '../schemas/login.schema';

/**
 * State returned by the login action
 */
export type LoginState = {
  success: boolean;
  error?: string;
  fieldErrors?: Partial<Record<keyof LoginFormData, string[]>>;
};

/**
 * Authenticate a user
 *
 * @param prevState - Previous form state (for useActionState)
 * @param formData - Form data from submission
 * @returns Updated state with success/error information
 */
export async function loginAction(
  prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  // Extract raw data from form with normalization
  const rawData = {
    email: (formData.get('email') as string)?.trim().toLowerCase(),
    password: formData.get('password'),
  };

  // Server-side validation with Zod
  const result = loginSchema.safeParse(rawData);
  if (!result.success) {
    return {
      success: false,
      error: 'Données invalides',
      fieldErrors: result.error.flatten().fieldErrors as Partial<Record<keyof LoginFormData, string[]>>,
    };
  }

  const { email, password } = result.data;

  try {
    await signIn('credentials', {
      email,
      password,
      redirect: false,
    });

    logger.info({ email }, 'Successful login');
    return { success: true };
  } catch (error) {
    // Handle Auth.js specific errors
    if (error instanceof AuthError) {
      // Check for deactivated account error (FR6)
      const errorMessage = error.cause?.err?.message;
      if (errorMessage === 'ACCOUNT_DEACTIVATED') {
        logger.warn({ email }, 'Login attempt on deactivated account');
        return {
          success: false,
          error: 'Votre compte a été désactivé. Contactez un administrateur.',
        };
      }

      switch (error.type) {
        case 'CredentialsSignin':
          // Log failed attempt (don't log password, only email for security audit)
          logger.info({ email }, 'Login attempt failed: invalid credentials');
          // Generic message to prevent email enumeration (security)
          return {
            success: false,
            error: 'Email ou mot de passe incorrect',
          };
        case 'AccessDenied':
          logger.warn({ email }, 'Login attempt denied: access denied');
          return {
            success: false,
            error: 'Accès refusé',
          };
        default:
          logger.error({ email, errorType: error.type }, 'Login attempt failed: unknown auth error');
          return {
            success: false,
            error: 'Une erreur est survenue. Veuillez réessayer.',
          };
      }
    }

    // Log unexpected errors
    logger.error({ error, email }, 'Unexpected error during login');
    // Re-throw unexpected errors (will be caught by error boundary)
    throw error;
  }
}
