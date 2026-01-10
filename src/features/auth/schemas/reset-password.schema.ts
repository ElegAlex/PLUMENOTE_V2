/**
 * Reset password form validation schema
 *
 * Shared between client and server for consistent validation.
 * All error messages are in French as per project requirements.
 *
 * Includes:
 * - Token validation (from URL parameter)
 * - New password validation (min 8 chars per NFR12)
 * - Password confirmation matching
 *
 * @see Story 2.4 - Réinitialisation de Mot de Passe (FR3)
 */

import { z } from 'zod';

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, 'Le token de réinitialisation est requis'),
    password: z
      .string()
      .min(8, 'Le mot de passe doit contenir au moins 8 caractères')
      .max(100, 'Le mot de passe ne peut pas dépasser 100 caractères'),
    confirmPassword: z.string().min(1, 'La confirmation du mot de passe est requise'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Les mots de passe ne correspondent pas',
    path: ['confirmPassword'],
  });

export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;
