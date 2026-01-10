/**
 * Profile form validation schemas
 *
 * Validation for profile update and avatar upload.
 * All error messages are in French as per project requirements.
 *
 * @see Story 2.5: Page de Profil Utilisateur (FR4)
 * @see AC #1: Name validation (optional, max 100 chars)
 * @see AC #5: Avatar type validation (JPG, PNG only)
 * @see AC #6: Avatar size validation (max 2MB)
 */

import { z } from 'zod';

/**
 * Maximum file size for avatar uploads (2MB)
 */
export const MAX_FILE_SIZE = 2 * 1024 * 1024;

/**
 * Accepted MIME types for avatar uploads
 */
export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png'] as const;

/**
 * Schema for profile update form
 *
 * Name is optional and can be null/empty.
 * Trims whitespace automatically.
 */
export const updateProfileSchema = z.object({
  name: z
    .string()
    .max(100, 'Le nom ne peut pas depasser 100 caracteres')
    .transform((val) => val.trim())
    .optional()
    .nullable(),
});

/**
 * Schema for avatar file upload validation
 *
 * Validates:
 * - File type must be JPEG or PNG
 * - File size must not exceed 2MB
 */
export const avatarFileSchema = z.object({
  file: z
    .instanceof(File)
    .refine(
      (file) => file.size <= MAX_FILE_SIZE,
      'Le fichier ne doit pas depasser 2MB'
    )
    .refine(
      (file) => ACCEPTED_IMAGE_TYPES.includes(file.type as typeof ACCEPTED_IMAGE_TYPES[number]),
      'Format non supporte (JPG, PNG uniquement)'
    ),
});

export type UpdateProfileFormData = z.infer<typeof updateProfileSchema>;
export type AvatarFileData = z.infer<typeof avatarFileSchema>;
