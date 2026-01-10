/**
 * Reset Password Page
 *
 * Page for setting a new password using a reset token.
 * Uses the auth layout for centered display.
 *
 * @see Story 2.4 - Réinitialisation de Mot de Passe (FR3)
 * @see AC #3: Reset password page with token
 * @see AC #4: Redirect to login after success
 * @see AC #5: Token invalidated after use
 * @see AC #6: Token expires after 1 hour
 */

import { Suspense } from 'react';
import { ResetPasswordForm } from '@/features/auth/components/ResetPasswordForm';

export const metadata = {
  title: 'Nouveau mot de passe | PlumeNote',
  description: 'Définissez votre nouveau mot de passe PlumeNote.',
};

/**
 * ResetPasswordForm wrapper with Suspense
 *
 * Required because ResetPasswordForm uses useSearchParams which needs
 * Suspense boundary in Next.js App Router when using static generation
 */
function ResetPasswordFormWithSuspense() {
  return (
    <Suspense fallback={<ResetPasswordFormSkeleton />}>
      <ResetPasswordForm />
    </Suspense>
  );
}

/**
 * Skeleton loader for ResetPasswordForm
 */
function ResetPasswordFormSkeleton() {
  return (
    <div className="w-full max-w-md rounded-lg border bg-card p-6 shadow-sm">
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="h-6 w-40 animate-pulse rounded bg-muted" />
          <div className="h-4 w-56 animate-pulse rounded bg-muted" />
        </div>
        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <div className="h-4 w-32 animate-pulse rounded bg-muted" />
            <div className="h-10 w-full animate-pulse rounded bg-muted" />
            <div className="h-3 w-28 animate-pulse rounded bg-muted" />
          </div>
          <div className="space-y-2">
            <div className="h-4 w-40 animate-pulse rounded bg-muted" />
            <div className="h-10 w-full animate-pulse rounded bg-muted" />
          </div>
          <div className="h-10 w-full animate-pulse rounded bg-muted" />
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return <ResetPasswordFormWithSuspense />;
}
