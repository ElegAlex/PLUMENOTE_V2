'use client';

/**
 * Avatar upload component
 *
 * Allows users to upload a new avatar or delete the existing one.
 * Uses React 19 useActionState for form handling.
 * Implements WCAG 2.1 AA accessibility requirements.
 *
 * @see Story 2.5: Page de Profil Utilisateur (FR4)
 * @see AC #2: Upload avatar (JPG/PNG, max 2MB)
 * @see AC #4: Delete avatar to return to default
 * @see AC #5: Reject non JPG/PNG files
 * @see AC #6: Reject files > 2MB
 * @see AC #8: Accessible form with labels, focus visible, ARIA
 */

import { useActionState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { uploadAvatarAction, type UploadAvatarState } from '../actions/upload-avatar.action';
import { deleteAvatarAction, type DeleteAvatarState } from '../actions/delete-avatar.action';

interface AvatarUploadProps {
  currentAvatar: string | null;
  userName: string | null;
}

const uploadInitialState: UploadAvatarState = { success: false };
const deleteInitialState: DeleteAvatarState = { success: false };

/**
 * AvatarUpload component
 *
 * Displays the current avatar with upload and delete functionality.
 */
export function AvatarUpload({ currentAvatar, userName }: AvatarUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const [uploadState, uploadFormAction, isUploading] = useActionState(
    uploadAvatarAction,
    uploadInitialState
  );

  const [deleteState, deleteFormAction, isDeleting] = useActionState(
    deleteAvatarAction,
    deleteInitialState
  );

  // Show toast on upload state change
  useEffect(() => {
    if (uploadState.success) {
      toast.success('Avatar mis a jour avec succes.');
    } else if (uploadState.error) {
      toast.error(uploadState.error);
    }
  }, [uploadState]);

  // Show toast on delete state change
  useEffect(() => {
    if (deleteState.success) {
      toast.success('Avatar supprime.');
    } else if (deleteState.error) {
      toast.error(deleteState.error);
    }
  }, [deleteState]);

  // Handle upload button click
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  // Handle file selection
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && formRef.current) {
      // Submit the form with the selected file
      formRef.current.requestSubmit();
    }
  };

  // Get avatar display
  const avatarInitial = userName ? userName.charAt(0).toUpperCase() : '?';
  const ariaLabel = userName ? `Avatar de ${userName}` : 'Avatar par defaut';

  return (
    <div className="flex items-center gap-4">
      {/* Avatar display */}
      {currentAvatar ? (
        <Image
          src={currentAvatar}
          alt={ariaLabel}
          role="img"
          aria-label={ariaLabel}
          width={64}
          height={64}
          className="h-16 w-16 rounded-full object-cover"
        />
      ) : (
        <div
          className="flex h-16 w-16 items-center justify-center rounded-full bg-muted text-muted-foreground text-xl font-medium"
          role="img"
          aria-label={ariaLabel}
        >
          {avatarInitial}
        </div>
      )}

      {/* Actions */}
      <div className="space-y-2">
        <div className="flex gap-2">
          {/* Upload form */}
          <form ref={formRef} action={uploadFormAction}>
            <Label htmlFor="avatar-upload" className="sr-only">
              Telecharger un avatar
            </Label>
            <input
              ref={fileInputRef}
              id="avatar-upload"
              name="avatar"
              type="file"
              accept="image/jpeg,image/png"
              onChange={handleFileChange}
              className="sr-only"
              data-testid="avatar-file-input"
              disabled={isUploading}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleUploadClick}
              disabled={isUploading}
            >
              {isUploading ? 'Upload en cours...' : 'Changer'}
            </Button>
          </form>

          {/* Delete button */}
          {currentAvatar && (
            <form action={deleteFormAction}>
              <Button
                type="submit"
                variant="outline"
                size="sm"
                disabled={isDeleting}
              >
                {isDeleting ? 'Suppression...' : 'Supprimer'}
              </Button>
            </form>
          )}
        </div>

        {/* File requirements */}
        <p className="text-xs text-muted-foreground">
          JPG, PNG uniquement. Max 2MB.
        </p>
      </div>
    </div>
  );
}
