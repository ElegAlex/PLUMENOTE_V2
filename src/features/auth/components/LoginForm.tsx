'use client';

/**
 * Login form component
 *
 * Uses React 19 useActionState for form handling.
 * Implements WCAG 2.1 AA accessibility requirements.
 *
 * @see AC #4: Accessible form with labels, focus visible, ARIA
 * @see AC #5: "Mot de passe oublié ?" link visible
 */

import { useActionState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { loginAction, type LoginState } from '../actions/login.action';
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

const initialState: LoginState = { success: false };

/**
 * Validates that the callback URL is safe (relative path only)
 * Prevents open redirect attacks
 */
function getSafeCallbackUrl(url: string | null): string {
  const defaultUrl = '/dashboard';

  if (!url) return defaultUrl;

  // Only allow relative paths starting with /
  // Reject absolute URLs, protocol-relative URLs, and javascript: URLs
  if (
    !url.startsWith('/') ||
    url.startsWith('//') ||
    url.toLowerCase().startsWith('/\\') ||
    url.includes(':')
  ) {
    return defaultUrl;
  }

  return url;
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = getSafeCallbackUrl(searchParams.get('callbackUrl'));

  const [state, formAction, isPending] = useActionState(loginAction, initialState);

  // Handle successful login
  useEffect(() => {
    if (state.success) {
      router.push(callbackUrl);
      router.refresh(); // Refresh to update session state
    }
  }, [state.success, router, callbackUrl]);

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold">Connexion</CardTitle>
        <CardDescription>
          Connectez-vous à votre compte PlumeNote
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          {/* Global error message (e.g., invalid credentials) */}
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
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Mot de passe</Label>
              <Link
                href="/forgot-password"
                className="text-sm text-muted-foreground hover:text-primary underline-offset-4 hover:underline"
              >
                Mot de passe oublié ?
              </Link>
            </div>
            <Input
              id="password"
              name="password"
              type="password"
              required
              disabled={isPending}
              autoComplete="current-password"
              aria-describedby={state.fieldErrors?.password ? 'password-error' : undefined}
              aria-invalid={state.fieldErrors?.password ? 'true' : undefined}
            />
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

          {/* Submit button */}
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? 'Connexion en cours...' : 'Se connecter'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
