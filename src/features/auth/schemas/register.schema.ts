/**
 * Registration form validation schema
 *
 * Shared between client and server for consistent validation.
 * All error messages are in French as per project requirements.
 */

import { z } from 'zod';

export const registerSchema = z.object({
  name: z
    .string()
    .min(2, 'Le nom doit contenir au moins 2 caractères')
    .max(100, 'Le nom ne peut pas dépasser 100 caractères'),
  email: z
    .string()
    .min(1, 'L\'email est requis')
    .email('Adresse email invalide')
    .max(255, 'L\'email ne peut pas dépasser 255 caractères'),
  password: z
    .string()
    .min(8, 'Le mot de passe doit contenir au moins 8 caractères')
    .max(100, 'Le mot de passe ne peut pas dépasser 100 caractères'),
});

export type RegisterFormData = z.infer<typeof registerSchema>;
