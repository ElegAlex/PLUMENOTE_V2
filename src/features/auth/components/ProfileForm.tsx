'use client';

/**
 * Profile form component
 *
 * Allows users to edit their profile information (name) and manage their avatar.
 * Uses React 19 useActionState for form handling.
 * Implements WCAG 2.1 AA accessibility requirements.
 *
 * @see Story 2.5: Page de Profil Utilisateur (FR4)
 * @see AC #1: Modify name with toast confirmation
 * @see AC #2: Upload avatar (JPG/PNG, max 2MB)
 * @see AC #4: Delete avatar to return to default
 * @see AC #8: Accessible form with labels, focus visible, ARIA
 */

import { useActionState, useEffect } from 'react';
import { toast } from 'sonner';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { updateProfileAction, type UpdateProfileState } from '../actions/update-profile.action';
import { AvatarUpload } from './AvatarUpload';

interface ProfileFormProps {
  user: {
    id: string;
    name: string | null;
    email: string;
    avatar: string | null;
    image: string | null;
  };
}

const initialState: UpdateProfileState = { success: false };

/**
 * ProfileForm component
 *
 * Displays profile information form with name editing and avatar management.
 */
export function ProfileForm({ user }: ProfileFormProps) {
  const [state, formAction, isPending] = useActionState(updateProfileAction, initialState);

  // Show toast notification on state change (AC #1)
  useEffect(() => {
    if (state.success) {
      toast.success('Profil mis a jour avec succes.');
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state]);

  return (
    <div className="space-y-6">
      {/* Avatar Section - Will be fully implemented in Task 7 */}
      <Card>
        <CardHeader>
          <CardTitle>Avatar</CardTitle>
          <CardDescription>
            Votre photo de profil. Formats acceptes: JPG, PNG (max 2MB).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AvatarUpload
            currentAvatar={user.avatar || user.image}
            userName={user.name}
          />
        </CardContent>
      </Card>

      {/* Profile Info Section */}
      <Card>
        <CardHeader>
          <CardTitle>Informations du profil</CardTitle>
          <CardDescription>
            Modifiez vos informations personnelles.
          </CardDescription>
        </CardHeader>
        <CardContent>
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

            <div className="space-y-2">
              <Label htmlFor="name">Nom</Label>
              <Input
                id="name"
                name="name"
                type="text"
                defaultValue={user.name || ''}
                placeholder="Votre nom"
                disabled={isPending}
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

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={user.email}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                L&apos;email ne peut pas etre modifie.
              </p>
            </div>

            <Button type="submit" disabled={isPending}>
              {isPending ? 'Enregistrement en cours...' : 'Enregistrer les modifications'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
