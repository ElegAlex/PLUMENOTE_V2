'use client';

/**
 * Forgot password form component
 *
 * Uses React 19 useActionState for form handling.
 * Implements WCAG 2.1 AA accessibility requirements.
 *
 * @see Story 2.4 - Réinitialisation de Mot de Passe (FR3)
 * @see AC #1: Request password reset with email
 * @see AC #2: Same success message for existing/non-existing emails
 * @see AC #7: Accessible form
 */

import { useActionState } from 'react';
import Link from 'next/link';
import {
  forgotPasswordAction,
  type ForgotPasswordState,
} from '../actions/forgot-password.action';
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

const initialState: ForgotPasswordState = { success: false };

export function ForgotPasswordForm() {
  const [state, formAction, isPending] = useActionState(
    forgotPasswordAction,
    initialState
  );

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold">
          Mot de passe oublié
        </CardTitle>
        <CardDescription>
          Entrez votre email pour recevoir un lien de réinitialisation
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Success message */}
        {state.success && state.message && (
          <div
            role="alert"
            className="mb-4 rounded-md bg-green-50 p-4 text-sm text-green-800 dark:bg-green-900/20 dark:text-green-400"
          >
            <p className="font-medium">Email envoyé !</p>
            <p className="mt-1">{state.message}</p>
            <Link
              href="/login"
              className="mt-3 inline-block text-sm font-medium underline-offset-4 hover:underline"
            >
              Retour à la connexion
            </Link>
          </div>
        )}

        {/* Form (hidden after success) */}
        {!state.success && (
          <form action={formAction} className="space-y-4">
            {/* Global error message */}
            {state.error && !state.fieldErrors && (
              <div
                role="alert"
                className="rounded-md bg-destructive/10 p-3 text-sm text-destructive"
              >
                {state.error}
              </div>
            )}

            {/* Email field */}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="votre@email.com"
                required
                disabled={isPending}
                autoComplete="email"
                aria-describedby={
                  state.fieldErrors?.email ? 'email-error' : undefined
                }
                aria-invalid={state.fieldErrors?.email ? 'true' : undefined}
              />
              {state.fieldErrors?.email && (
                <p
                  id="email-error"
                  role="alert"
                  className="text-sm text-destructive"
                >
                  {state.fieldErrors.email[0]}
                </p>
              )}
            </div>

            {/* Submit button */}
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending
                ? 'Envoi en cours...'
                : 'Envoyer le lien de réinitialisation'}
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
