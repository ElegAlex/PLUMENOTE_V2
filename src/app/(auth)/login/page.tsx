/**
 * Login Page
 *
 * Public page for user authentication.
 * Uses the auth layout for centered display.
 *
 * @see FR2: User can login with email and password
 * @see AC #1: Redirect to dashboard after successful login
 * @see AC #5: Link to forgot-password and register pages
 */

import Link from 'next/link';
import { Suspense } from 'react';
import { LoginForm } from '@/features/auth/components/LoginForm';

export const metadata = {
  title: 'Connexion | PlumeNote',
  description: 'Connectez-vous à votre compte PlumeNote pour accéder à vos notes et collaborer avec votre équipe.',
};

/**
 * LoginForm wrapper with Suspense
 *
 * Required because LoginForm uses useSearchParams which needs Suspense boundary
 * in Next.js App Router when using static generation
 */
function LoginFormWithSuspense() {
  return (
    <Suspense fallback={<LoginFormSkeleton />}>
      <LoginForm />
    </Suspense>
  );
}

/**
 * Skeleton loader for LoginForm
 */
function LoginFormSkeleton() {
  return (
    <div className="w-full max-w-md rounded-lg border bg-card p-6 shadow-sm">
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="h-6 w-24 animate-pulse rounded bg-muted" />
          <div className="h-4 w-48 animate-pulse rounded bg-muted" />
        </div>
        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <div className="h-4 w-12 animate-pulse rounded bg-muted" />
            <div className="h-10 w-full animate-pulse rounded bg-muted" />
          </div>
          <div className="space-y-2">
            <div className="h-4 w-24 animate-pulse rounded bg-muted" />
            <div className="h-10 w-full animate-pulse rounded bg-muted" />
          </div>
          <div className="h-10 w-full animate-pulse rounded bg-muted" />
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="space-y-6">
      <LoginFormWithSuspense />

      <p className="text-center text-sm text-muted-foreground">
        Pas encore de compte ?{' '}
        <Link
          href="/register"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          Créer un compte
        </Link>
      </p>
    </div>
  );
}
