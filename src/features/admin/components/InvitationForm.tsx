'use client';

/**
 * InvitationForm component
 *
 * Form for sending invitations to new users.
 * Uses React 19 useActionState for form handling.
 * Implements WCAG 2.1 AA accessibility requirements.
 *
 * @see Story 2.6 - Invitation de Nouveaux Utilisateurs (FR5)
 * @see AC #7: Accessible form with proper labels and ARIA
 */

import { useActionState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Mail } from 'lucide-react';
import {
  sendInvitationAction,
  type SendInvitationState,
} from '../actions/send-invitation.action';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const initialState: SendInvitationState = { success: false };

export function InvitationForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, isPending] = useActionState(
    sendInvitationAction,
    initialState
  );

  // Handle successful invitation
  useEffect(() => {
    if (state.success && state.message) {
      toast.success(state.message);
      formRef.current?.reset();
      router.refresh(); // Refresh to update the invitation list
    }
  }, [state.success, state.message, router]);

  // Handle error
  useEffect(() => {
    if (!state.success && state.error && !state.fieldErrors) {
      toast.error(state.error);
    }
  }, [state.success, state.error, state.fieldErrors]);

  // Determine if there's an error to display inline
  const inlineError = state.fieldErrors?.email?.[0] || (!state.success && state.error ? state.error : null);
  const hasError = Boolean(inlineError);

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      {/* Email field */}
      <div className="space-y-2">
        <Label htmlFor="invitation-email">Adresse email</Label>
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Mail
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              id="invitation-email"
              name="email"
              type="email"
              placeholder="nouvel.utilisateur@exemple.com"
              required
              disabled={isPending}
              autoComplete="off"
              className="pl-10"
              aria-describedby={hasError ? 'invitation-email-error' : undefined}
              aria-invalid={hasError ? 'true' : undefined}
            />
          </div>
          <Button type="submit" disabled={isPending}>
            {isPending ? 'Envoi...' : 'Envoyer l\'invitation'}
          </Button>
        </div>
        {hasError && (
          <p
            id="invitation-email-error"
            role="alert"
            className="text-sm text-destructive"
          >
            {inlineError}
          </p>
        )}
      </div>
    </form>
  );
}
