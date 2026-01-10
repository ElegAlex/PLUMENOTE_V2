/**
 * Registration Page
 *
 * Allows new users to create an account.
 * FR1: Un utilisateur peut créer un compte avec email et mot de passe
 * FR5: Supports invitation tokens for pre-authorized registration
 */

import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { RegisterForm } from '@/features/auth/components/RegisterForm';

export const metadata = {
  title: 'Créer un compte | PlumeNote',
  description: 'Créez votre compte PlumeNote pour commencer à collaborer avec votre équipe.',
};

type SearchParams = Promise<{ token?: string }>;

/**
 * Validate an invitation token and return the associated email
 */
async function validateInvitationToken(token: string | undefined): Promise<{
  valid: boolean;
  email?: string;
  error?: string;
}> {
  if (!token) {
    return { valid: false };
  }

  const invitation = await prisma.invitation.findUnique({
    where: { token },
    select: { email: true, usedAt: true, expiresAt: true },
  });

  if (!invitation) {
    return { valid: false, error: 'Invitation invalide ou expirée.' };
  }

  if (invitation.usedAt) {
    return { valid: false, error: 'Cette invitation a déjà été utilisée.' };
  }

  if (invitation.expiresAt < new Date()) {
    return { valid: false, error: 'Cette invitation a expiré.' };
  }

  return { valid: true, email: invitation.email };
}

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { token } = await searchParams;
  const invitation = await validateInvitationToken(token);

  return (
    <div className="space-y-6">
      {invitation.error && (
        <div
          role="alert"
          className="rounded-md bg-destructive/10 p-4 text-sm text-destructive"
        >
          {invitation.error}
        </div>
      )}
      <RegisterForm
        invitationToken={invitation.valid ? token : undefined}
        prefilledEmail={invitation.email}
      />
      <p className="text-center text-sm text-muted-foreground">
        Déjà un compte ?{' '}
        <Link
          href="/login"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          Se connecter
        </Link>
      </p>
    </div>
  );
}
