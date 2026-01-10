/**
 * Forgot Password Page
 *
 * Public page for requesting a password reset.
 * Uses the auth layout for centered display.
 *
 * @see Story 2.4 - Réinitialisation de Mot de Passe (FR3)
 * @see AC #1: Request password reset with email
 * @see AC #2: Same success message for existing/non-existing emails
 */

import { ForgotPasswordForm } from '@/features/auth/components/ForgotPasswordForm';

export const metadata = {
  title: 'Mot de passe oublié | PlumeNote',
  description:
    'Réinitialisez votre mot de passe PlumeNote en quelques étapes simples.',
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
