/**
 * Forgot password form validation schema
 *
 * Shared between client and server for consistent validation.
 * All error messages are in French as per project requirements.
 *
 * @see Story 2.4 - Réinitialisation de Mot de Passe (FR3)
 */

import { z } from 'zod';

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, 'L\'email est requis')
    .email('Adresse email invalide')
    .max(255, 'L\'email ne peut pas dépasser 255 caractères'),
});

export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;
