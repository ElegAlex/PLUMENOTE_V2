'use server';

/**
 * Server Action for sending user invitations
 *
 * Handles the invitation flow:
 * 1. Verify admin authorization
 * 2. Validate email format
 * 3. Check email is not already registered
 * 4. Check for existing pending invitation
 * 5. Generate invitation token
 * 6. Create invitation record
 * 7. Send invitation email
 *
 * @see Story 2.6 - Invitation de Nouveaux Utilisateurs (FR5)
 */

import crypto from 'crypto';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { emailService } from '@/lib/email';
import {
  sendInvitationSchema,
  type SendInvitationFormData,
} from '../schemas/invitation.schema';

/**
 * State returned by the send invitation action
 */
export type SendInvitationState = {
  success: boolean;
  message?: string;
  error?: string;
  fieldErrors?: Partial<Record<keyof SendInvitationFormData, string[]>>;
};

/**
 * Invitation token length in bytes (32 bytes = 256 bits of entropy)
 * Encoded as base64url, results in ~43 character string
 */
const TOKEN_LENGTH_BYTES = 32;

/**
 * Invitation expiration time in milliseconds (7 days)
 */
const INVITATION_EXPIRATION_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Generate a cryptographically secure invitation token
 */
function generateInvitationToken(): string {
  return crypto.randomBytes(TOKEN_LENGTH_BYTES).toString('base64url');
}

/**
 * Send an invitation to join PlumeNote
 *
 * SECURITY: Only accessible by authenticated users with ADMIN role.
 *
 * @param prevState - Previous form state (for useActionState)
 * @param formData - Form data containing email
 * @returns Updated state with success/error information
 */
export async function sendInvitationAction(
  prevState: SendInvitationState,
  formData: FormData
): Promise<SendInvitationState> {
  // Verify authentication and admin role
  const session = await auth();
  if (!session?.user) {
    logger.warn('Invitation attempt without authentication');
    return {
      success: false,
      error: 'Vous devez être connecté pour envoyer une invitation.',
    };
  }

  if (session.user.role !== 'ADMIN') {
    logger.warn(
      { userId: session.user.id },
      'Non-admin user attempted to send invitation'
    );
    return {
      success: false,
      error: 'Seuls les administrateurs peuvent envoyer des invitations.',
    };
  }

  // Extract and normalize email
  const rawEmail = formData.get('email');
  const normalizedEmail =
    typeof rawEmail === 'string' ? rawEmail.trim().toLowerCase() : '';

  // Server-side validation with Zod
  const result = sendInvitationSchema.safeParse({ email: normalizedEmail });
  if (!result.success) {
    return {
      success: false,
      error: 'Données invalides',
      fieldErrors: result.error.flatten()
        .fieldErrors as Partial<Record<keyof SendInvitationFormData, string[]>>,
    };
  }

  const { email } = result.data;

  try {
    // Check if email is already registered
    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingUser) {
      return {
        success: false,
        error: 'Un utilisateur avec cet email existe déjà.',
      };
    }

    // Check for existing pending invitation
    const existingInvitation = await prisma.invitation.findFirst({
      where: {
        email,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      select: { id: true },
    });

    if (existingInvitation) {
      return {
        success: false,
        error: 'Une invitation est déjà en cours pour cet email.',
      };
    }

    // Generate invitation token
    const token = generateInvitationToken();
    const expiresAt = new Date(Date.now() + INVITATION_EXPIRATION_MS);

    // Create invitation record
    await prisma.invitation.create({
      data: {
        email,
        token,
        expiresAt,
        invitedById: session.user.id,
      },
    });

    // Build registration URL with token
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const registerUrl = `${baseUrl}/register?token=${token}`;

    // Get inviter name for the email
    const inviterName = session.user.name || 'Un administrateur';

    // Send invitation email
    await emailService.sendInvitationEmail(email, registerUrl, inviterName);

    logger.info(
      { email, invitedById: session.user.id },
      'Invitation sent successfully'
    );

    // Revalidate the admin users page to refresh the invitation list
    revalidatePath('/admin/users');

    return {
      success: true,
      message: `Invitation envoyée à ${email}`,
    };
  } catch (error) {
    logger.error({ email, error }, 'Error sending invitation');
    return {
      success: false,
      error: 'Une erreur est survenue. Veuillez réessayer.',
    };
  }
}
