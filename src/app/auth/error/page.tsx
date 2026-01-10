/**
 * Authentication Error Page
 *
 * Displays authentication errors to the user with helpful messages.
 * This page is referenced in auth.config.ts as the error page.
 *
 * @see https://authjs.dev/guides/pages/error
 */

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * Error code to user-friendly message mapping
 */
const errorMessages: Record<string, { title: string; description: string }> = {
  Configuration: {
    title: 'Erreur de configuration',
    description: 'Un problème de configuration serveur a été détecté. Contactez l\'administrateur.',
  },
  AccessDenied: {
    title: 'Accès refusé',
    description: 'Vous n\'avez pas les permissions nécessaires pour accéder à cette ressource.',
  },
  Verification: {
    title: 'Lien expiré',
    description: 'Le lien de vérification a expiré ou a déjà été utilisé.',
  },
  OAuthSignin: {
    title: 'Erreur de connexion',
    description: 'Une erreur s\'est produite lors de la connexion. Veuillez réessayer.',
  },
  OAuthCallback: {
    title: 'Erreur de callback',
    description: 'Une erreur s\'est produite lors du retour du fournisseur d\'authentification.',
  },
  OAuthCreateAccount: {
    title: 'Erreur de création de compte',
    description: 'Impossible de créer votre compte. L\'email est peut-être déjà utilisé.',
  },
  EmailCreateAccount: {
    title: 'Erreur de création de compte',
    description: 'Impossible de créer votre compte avec cet email.',
  },
  Callback: {
    title: 'Erreur de callback',
    description: 'Une erreur s\'est produite lors du traitement de votre demande.',
  },
  OAuthAccountNotLinked: {
    title: 'Compte non lié',
    description: 'Un compte existe déjà avec cet email. Connectez-vous avec votre méthode habituelle.',
  },
  EmailSignin: {
    title: 'Erreur d\'envoi d\'email',
    description: 'Impossible d\'envoyer l\'email de connexion. Vérifiez votre adresse.',
  },
  CredentialsSignin: {
    title: 'Identifiants invalides',
    description: 'L\'email ou le mot de passe est incorrect.',
  },
  SessionRequired: {
    title: 'Session requise',
    description: 'Vous devez être connecté pour accéder à cette page.',
  },
  Default: {
    title: 'Erreur d\'authentification',
    description: 'Une erreur inattendue s\'est produite. Veuillez réessayer.',
  },
};

interface AuthErrorPageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function AuthErrorPage({ searchParams }: AuthErrorPageProps) {
  const params = await searchParams;
  const errorCode = params.error ?? 'Default';
  const errorInfo = errorMessages[errorCode] ?? errorMessages.Default;
  const title = errorInfo?.title ?? 'Erreur';
  const description = errorInfo?.description ?? 'Une erreur s\'est produite.';

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <svg
              className="h-6 w-6 text-destructive"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Button asChild className="w-full">
            <Link href="/login">Retour à la connexion</Link>
          </Button>
          <Button asChild variant="outline" className="w-full">
            <Link href="/">Retour à l&apos;accueil</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
