'use server';

/**
 * Server Action for user registration
 *
 * Handles form submission, validation, and user creation.
 * Uses bcrypt for password hashing (cost >= 10 per NFR12).
 *
 * @see Story 2.6: Supports invitation tokens (FR5)
 */

import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/password';
import { logger } from '@/lib/logger';
import { registerSchema, type RegisterFormData } from '../schemas/register.schema';

/**
 * State returned by the register action
 */
export type RegisterState = {
  success: boolean;
  error?: string;
  fieldErrors?: Partial<Record<keyof RegisterFormData, string[]>>;
};

/**
 * Register a new user
 *
 * @param prevState - Previous form state (for useActionState)
 * @param formData - Form data from submission
 * @returns Updated state with success/error information
 */
export async function registerAction(
  prevState: RegisterState,
  formData: FormData
): Promise<RegisterState> {
  // Extract raw data from form with trimming
  const rawData = {
    name: (formData.get('name') as string)?.trim(),
    email: (formData.get('email') as string)?.trim(),
    password: formData.get('password'),
  };

  // Extract optional invitation token
  const invitationToken = formData.get('invitationToken') as string | null;

  // Server-side validation with Zod
  const result = registerSchema.safeParse(rawData);
  if (!result.success) {
    return {
      success: false,
      error: 'Données invalides',
      fieldErrors: result.error.flatten().fieldErrors as Partial<Record<keyof RegisterFormData, string[]>>,
    };
  }

  const { name, password } = result.data;
  // Normalize email to lowercase for case-insensitive uniqueness
  const email = result.data.email.toLowerCase();

  // If invitation token provided, validate it
  let invitation = null;
  if (invitationToken) {
    invitation = await prisma.invitation.findUnique({
      where: { token: invitationToken },
      select: { id: true, email: true, usedAt: true, expiresAt: true },
    });

    if (!invitation) {
      return {
        success: false,
        error: 'Invitation invalide ou expirée.',
      };
    }

    if (invitation.usedAt) {
      return {
        success: false,
        error: 'Cette invitation a déjà été utilisée.',
      };
    }

    if (invitation.expiresAt < new Date()) {
      return {
        success: false,
        error: 'Cette invitation a expiré.',
      };
    }

    // Verify email matches invitation
    if (invitation.email.toLowerCase() !== email) {
      return {
        success: false,
        error: 'L\'email ne correspond pas à l\'invitation.',
      };
    }
  }

  // Check email uniqueness
  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existingUser) {
    return {
      success: false,
      error: 'Un compte existe déjà avec cet email',
    };
  }

  // Hash password and create user with error handling
  try {
    const hashedPassword = await hashPassword(password);

    // Use transaction to create user and mark invitation as used
    await prisma.$transaction(async (tx) => {
      await tx.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          role: 'VIEWER',
        },
      });

      // Mark invitation as used if present
      if (invitation) {
        await tx.invitation.update({
          where: { id: invitation.id },
          data: { usedAt: new Date() },
        });

        logger.info(
          { email, invitationId: invitation.id },
          'User registered via invitation'
        );
      } else {
        logger.info({ email }, 'User registered without invitation');
      }
    });

    return { success: true };
  } catch (error) {
    logger.error({ email, error }, 'Registration error');
    return {
      success: false,
      error: 'Une erreur est survenue lors de la création du compte. Veuillez réessayer.',
    };
  }
}
