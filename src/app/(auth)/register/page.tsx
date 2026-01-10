/**
 * Registration Page
 *
 * Allows new users to create an account.
 * FR1: Un utilisateur peut créer un compte avec email et mot de passe
 */

import Link from 'next/link';
import { RegisterForm } from '@/features/auth/components/RegisterForm';

export const metadata = {
  title: 'Créer un compte | PlumeNote',
  description: 'Créez votre compte PlumeNote pour commencer à collaborer avec votre équipe.',
};

export default function RegisterPage() {
  return (
    <div className="space-y-6">
      <RegisterForm />
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
