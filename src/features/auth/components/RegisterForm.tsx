'use client';

/**
 * Registration form component
 *
 * Uses React 19 useActionState for form handling.
 * Implements WCAG 2.1 AA accessibility requirements.
 */

import { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { registerAction, type RegisterState } from '../actions/register.action';
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

const initialState: RegisterState = { success: false };

export function RegisterForm() {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(registerAction, initialState);

  // Handle successful registration
  useEffect(() => {
    if (state.success) {
      toast.success('Compte créé avec succès !');
      router.push('/login');
    }
  }, [state.success, router]);

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold">Créer un compte</CardTitle>
        <CardDescription>
          Entrez vos informations pour créer votre compte PlumeNote
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          {/* Global error message (e.g., email already exists) */}
          {state.error && !state.fieldErrors && (
            <div
              role="alert"
              className="rounded-md bg-destructive/10 p-3 text-sm text-destructive"
            >
              {state.error}
            </div>
          )}

          {/* Name field */}
          <div className="space-y-2">
            <Label htmlFor="name">Nom</Label>
            <Input
              id="name"
              name="name"
              type="text"
              placeholder="Votre nom"
              required
              disabled={isPending}
              autoComplete="name"
              aria-describedby={state.fieldErrors?.name ? 'name-error' : undefined}
              aria-invalid={state.fieldErrors?.name ? 'true' : undefined}
            />
            {state.fieldErrors?.name && (
              <p
                id="name-error"
                role="alert"
                className="text-sm text-destructive"
              >
                {state.fieldErrors.name[0]}
              </p>
            )}
          </div>

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
              aria-describedby={state.fieldErrors?.email ? 'email-error' : undefined}
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

          {/* Password field */}
          <div className="space-y-2">
            <Label htmlFor="password">Mot de passe</Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="Minimum 8 caractères"
              required
              disabled={isPending}
              autoComplete="new-password"
              aria-describedby={
                state.fieldErrors?.password ? 'password-error' : 'password-hint'
              }
              aria-invalid={state.fieldErrors?.password ? 'true' : undefined}
            />
            {state.fieldErrors?.password ? (
              <p
                id="password-error"
                role="alert"
                className="text-sm text-destructive"
              >
                {state.fieldErrors.password[0]}
              </p>
            ) : (
              <p id="password-hint" className="text-sm text-muted-foreground">
                Le mot de passe doit contenir au moins 8 caractères
              </p>
            )}
          </div>

          {/* Submit button */}
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? 'Création en cours...' : 'Créer mon compte'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
