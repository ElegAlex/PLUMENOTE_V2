'use client';

/**
 * Reset password form component
 *
 * Uses React 19 useActionState for form handling.
 * Implements WCAG 2.1 AA accessibility requirements.
 *
 * @see Story 2.4 - Réinitialisation de Mot de Passe (FR3)
 * @see AC #3: Reset password page with token
 * @see AC #4: Redirect to login after success
 * @see AC #7: Accessible form
 */

import { useActionState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  resetPasswordAction,
  type ResetPasswordState,
} from '../actions/reset-password.action';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

const initialState: ResetPasswordState = { success: false };

interface ResetPasswordFormProps {
  token?: string | null;
}

export function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tokenValue = token ?? searchParams.get('token');

  const [state, formAction, isPending] = useActionState(
    resetPasswordAction,
    initialState
  );

  // Handle successful password reset
  useEffect(() => {
    if (state.success) {
      // Redirect to login after short delay to show success message
      const timeout = setTimeout(() => {
        router.push('/login?reset=success');
      }, 2000);
      return () => clearTimeout(timeout);
    }
  }, [state.success, router]);

  // No token provided
  if (!tokenValue) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Lien invalide</CardTitle>
          <CardDescription>
            Le lien de réinitialisation est incomplet ou invalide.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            role="alert"
            className="mb-4 rounded-md bg-destructive/10 p-4 text-sm text-destructive"
          >
            Aucun token de réinitialisation n&apos;a été fourni. Veuillez
            utiliser le lien complet reçu par email.
          </div>
          <Link
            href="/forgot-password"
            className="inline-block text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            Demander un nouveau lien
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold">
          Nouveau mot de passe
        </CardTitle>
        <CardDescription>
          Définissez votre nouveau mot de passe
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Success message */}
        {state.success && (
          <div
            role="alert"
            className="mb-4 rounded-md bg-green-50 p-4 text-sm text-green-800 dark:bg-green-900/20 dark:text-green-400"
          >
            <p className="font-medium">Mot de passe modifié !</p>
            <p className="mt-1">
              Votre mot de passe a été réinitialisé avec succès. Vous allez être
              redirigé vers la page de connexion...
            </p>
          </div>
        )}

        {/* Form (hidden after success) */}
        {!state.success && (
          <form action={formAction} className="space-y-4">
            {/* Hidden token field */}
            <input type="hidden" name="token" value={tokenValue} />

            {/* Global error message */}
            {state.error && !state.fieldErrors && (
              <div
                role="alert"
                className="rounded-md bg-destructive/10 p-3 text-sm text-destructive"
              >
                {state.error}
              </div>
            )}

            {/* New password field */}
            <div className="space-y-2">
              <Label htmlFor="password">Nouveau mot de passe</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                minLength={8}
                disabled={isPending}
                autoComplete="new-password"
                aria-describedby={`password-hint${state.fieldErrors?.password ? ' password-error' : ''}`}
                aria-invalid={state.fieldErrors?.password ? 'true' : undefined}
              />
              <p id="password-hint" className="text-xs text-muted-foreground">
                Minimum 8 caractères
              </p>
              {state.fieldErrors?.password && (
                <p
                  id="password-error"
                  role="alert"
                  className="text-sm text-destructive"
                >
                  {state.fieldErrors.password[0]}
                </p>
              )}
            </div>

            {/* Confirm password field */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                disabled={isPending}
                autoComplete="new-password"
                aria-describedby={
                  state.fieldErrors?.confirmPassword
                    ? 'confirmPassword-error'
                    : undefined
                }
                aria-invalid={
                  state.fieldErrors?.confirmPassword ? 'true' : undefined
                }
              />
              {state.fieldErrors?.confirmPassword && (
                <p
                  id="confirmPassword-error"
                  role="alert"
                  className="text-sm text-destructive"
                >
                  {state.fieldErrors.confirmPassword[0]}
                </p>
              )}
            </div>

            {/* Submit button */}
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending
                ? 'Modification en cours...'
                : 'Modifier le mot de passe'}
            </Button>

            {/* Back to login link */}
            <div className="text-center text-sm">
              <Link
                href="/login"
                className="text-muted-foreground hover:text-primary underline-offset-4 hover:underline"
              >
                Retour à la connexion
              </Link>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
