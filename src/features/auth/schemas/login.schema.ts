/**
 * Login form validation schema
 *
 * Shared between client and server for consistent validation.
 * All error messages are in French as per project requirements.
 *
 * Note: Unlike register schema, password has no min length validation
 * because we only need to verify the field is not empty for login.
 */

import { z } from 'zod';

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'L\'email est requis')
    .email('Adresse email invalide')
    .max(255, 'L\'email ne peut pas dépasser 255 caractères'),
  password: z
    .string()
    .min(1, 'Le mot de passe est requis'),
});

export type LoginFormData = z.infer<typeof loginSchema>;
